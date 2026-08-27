/**
 * Extract job postings from public ATS career URLs.
 * Engine order: TinyFish Fetch (JS-rendered) → native HTML fetch.
 * Allowed: Greenhouse, Lever, Ashby, Workday public pages, generic JobPosting JSON-LD.
 * Not for LinkedIn/Naukri login walls or Easy Apply automation.
 */

import { isTinyFishConfigured, tinyfishFetchOne } from "@/lib/engines/tinyfish";
import { extractJobSignals, type JobSignals } from "@/lib/jobs/job-signals";
import { attributeJobSource } from "@/lib/jobs/job-sources";
import {
  inferRoleFamilyFromText,
  type RoleFamily,
} from "@/lib/product/targets";

export type ExtractedJob = {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  source: string;
  engine?: "tinyfish" | "native" | "portal";
  postedAt?: string;
  salary?: string;
  salaryLpaMin?: number;
  salaryLpaMax?: number;
  noticeDays?: number;
  roleFamily?: RoleFamily;
  isJobDetail?: boolean;
  sourceLabel?: string;
  sourcePlatform?: string;
  sourcePublisher?: string;
  sourceOfficial?: boolean;
  discoveredAt?: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

type JsonLdJob = Partial<ExtractedJob> & {
  datePosted?: unknown;
  baseSalary?: unknown;
  signals?: JobSignals;
};

function parseJsonLdJobs(html: string): JsonLdJob | null {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const m of scripts) {
    try {
      const raw = JSON.parse(m[1]);
      const nodes = Array.isArray(raw) ? raw : raw["@graph"] ? raw["@graph"] : [raw];
      for (const n of nodes) {
        if (!n) continue;
        const type = String(n["@type"] || "");
        if (!/JobPosting/i.test(type)) continue;
        const description = stripHtml(String(n.description || ""));
        const signals = extractJobSignals({
          description,
          datePosted: n.datePosted,
          baseSalary: n.baseSalary,
          salary:
            typeof n.baseSalary === "string"
              ? n.baseSalary
              : n.estimatedSalary
                ? String(n.estimatedSalary)
                : undefined,
        });
        return {
          title: n.title || n.name || "",
          company: n.hiringOrganization?.name || n.hiringOrganization || "",
          location:
            n.jobLocation?.address?.addressLocality ||
            n.jobLocation?.name ||
            (typeof n.jobLocation === "string" ? n.jobLocation : "") ||
            "India",
          description,
          ...signals,
          isJobDetail: true,
        };
      }
    } catch {
      // continue
    }
  }
  return null;
}

function detectSource(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("greenhouse.io")) return "greenhouse";
  if (u.includes("lever.co")) return "lever";
  if (u.includes("ashbyhq.com")) return "ashby";
  if (u.includes("myworkdayjobs.com") || u.includes("workday")) return "workday";
  if (u.includes("successfactors")) return "successfactors";
  if (u.includes("smartrecruiters.com")) return "smartrecruiters";
  if (u.includes("icims.com")) return "icims";
  if (u.includes("taleo.")) return "taleo";
  if (u.includes("ripplehire.com")) return "ripplehire";
  if (u.includes("zwayam.com")) return "zwayam";
  if (u.includes("turbohire")) return "turbohire";
  if (u.includes("naukri.com") || u.includes("linkedin.com")) return "user_paste_url";
  return "career_page";
}

export function isSupportedJobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Prefer specific job-detail URLs over bare careers / jobs listing homepages.
 */
export function isJobDetailUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = (u.pathname || "/").replace(/\/+$/, "") || "/";
    const href = u.href.toLowerCase();

    // Known ATS job-detail patterns
    if (/boards\.greenhouse\.io\/.+\/jobs\/\d+/i.test(href)) return true;
    if (/jobs\.lever\.co\/[^/]+\/[a-f0-9-]{8,}/i.test(href)) return true;
    if (/jobs\.ashbyhq\.com\/[^/]+\/[^/]+/i.test(href)) return true;
    if (/myworkdayjobs\.com\/.+\/job\//i.test(href)) return true;
    if (/jobs\.siemens\.com\/.+\/jobdetail\//i.test(href)) return true;
    if (/jobs\.smartrecruiters\.com\/[^/]+\/[^/]+/i.test(href)) return true;
    if (/careers\.se\.com\/jobs\/\d+/i.test(href)) return true;
    if (/careers\.abb\/.+\/job\//i.test(href)) return true;
    if (/[?&](career_job_req_id|jobid|job_id|req_id|requisition)=/i.test(u.search)) {
      return true;
    }
    if (/\.pdf$/i.test(path) && /career|recruit|opening|vacanc|advert/i.test(href)) {
      return true;
    }
    if (/\/jobs?\/[^/]+/i.test(path) && path.split("/").filter(Boolean).length >= 2) {
      // /jobs/role-slug or /job/123 — not bare /jobs
      if (!/^\/jobs?$/i.test(path)) return true;
    }
    if (/\/(vacanc(?:y|ies)|opening|position|requisition)s?\/[^/]+/i.test(path)) return true;
    if (/[?&](gh_jid|jobId|job_id|req_id|requisition)=/i.test(u.search)) return true;

    // Bare careers / jobs roots — reject
    if (
      /^\/(careers|jobs|job|vacancies|work-with-us)?$/i.test(path) ||
      path === "/"
    ) {
      // careers.company.com/ alone is listing
      if (/^careers\./i.test(host) && path === "/") return false;
      return false;
    }

    // /careers alone or /careers/ something shallow without job id
    if (/^\/careers$/i.test(path)) return false;
    if (/^\/careers\/[^/]+$/i.test(path) && !/\d{3,}|job|apply|opening/i.test(path)) {
      // company.com/careers/india style listing — weak
      return false;
    }

    return /\/careers\/.+/i.test(path) && path.split("/").filter(Boolean).length >= 3;
  } catch {
    return false;
  }
}

function companyFromHost(url: string): string {
  try {
    const company = new URL(url).hostname.replace(/^www\./, "").split(".")[0] || "Employer";
    return company.charAt(0).toUpperCase() + company.slice(1);
  } catch {
    return "Employer";
  }
}

function enrichExtracted(job: ExtractedJob): ExtractedJob {
  const signals = extractJobSignals({
    description: job.description,
    salary: job.salary,
    datePosted: job.postedAt,
  });
  const roleFamily =
    job.roleFamily ||
    inferRoleFamilyFromText(`${job.title} ${job.description}`);
  const attribution = attributeJobSource(job.applyUrl, job.company);
  return {
    ...job,
    ...signals,
    salary: signals.salary || job.salary,
    roleFamily,
    isJobDetail: job.isJobDetail ?? isJobDetailUrl(job.applyUrl),
    sourceLabel: attribution.label,
    sourcePlatform: attribution.platform,
    sourcePublisher: attribution.publisher,
    sourceOfficial: attribution.official,
    discoveredAt: job.discoveredAt || new Date().toISOString(),
  };
}

function parseJobFromHtml(
  url: string,
  html: string,
  source: string,
  engine: "tinyfish" | "native",
): ExtractedJob {
  const ld = parseJsonLdJobs(html);

  let title = ld?.title || "";
  let company = typeof ld?.company === "string" ? ld.company : "";
  const location = ld?.location || "India";
  let description = ld?.description || "";

  if (!title) {
    const og = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    title = stripHtml(og?.[1] || h1?.[1] || "Role");
  }
  if (!company) company = companyFromHost(url);
  if (!description || description.length < 80) {
    const content =
      html.match(/<div[^>]+id=["']content["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
      html.match(
        /<div[^>]+class=["'][^"']*job-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      )?.[1] ||
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
      "";
    description = stripHtml(content).slice(0, 8000);
  }
  if (description.length < 40) {
    throw new Error("Could not extract enough job text. Paste the JD manually.");
  }

  const hasLd = Boolean(ld?.title || ld?.description);
  if (!hasLd && !isJobDetailUrl(url) && description.length < 400) {
    throw new Error("URL looks like a careers homepage, not a specific job posting.");
  }

  return enrichExtracted({
    title: title.slice(0, 160),
    company: String(company).slice(0, 120),
    location: String(location).slice(0, 120),
    description: description.slice(0, 8000),
    applyUrl: url,
    source,
    engine,
    postedAt: ld?.postedAt,
    salary: ld?.salary,
    salaryLpaMin: ld?.salaryLpaMin,
    salaryLpaMax: ld?.salaryLpaMax,
    noticeDays: ld?.noticeDays,
    isJobDetail: hasLd || isJobDetailUrl(url),
  });
}

function parseJobFromMarkdown(
  url: string,
  md: string,
  meta: { title?: string | null; description?: string | null },
  source: string,
): ExtractedJob {
  const lines = md.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let title = meta.title || "";
  if (!title) {
    const h1 = lines.find((l) => l.startsWith("# "));
    title = h1 ? h1.replace(/^#\s+/, "") : lines[0] || "Role";
  }
  const description = (md.length >= 40 ? md : meta.description || "").slice(0, 8000);
  if (description.length < 40) {
    throw new Error("Could not extract enough job text. Paste the JD manually.");
  }
  if (!isJobDetailUrl(url) && description.length < 400) {
    throw new Error("URL looks like a careers homepage, not a specific job posting.");
  }
  return enrichExtracted({
    title: title.slice(0, 160),
    company: companyFromHost(url),
    location: "India",
    description,
    applyUrl: url,
    source,
    engine: "tinyfish",
    isJobDetail: isJobDetailUrl(url),
  });
}

async function extractViaTinyFish(url: string, source: string): Promise<ExtractedJob> {
  try {
    const htmlPage = await tinyfishFetchOne(url, {
      format: "html",
      ttl: 0,
      intent:
        "Extract the full public job posting (title, company, location, description, salary, date posted) for an assisted apply packet. Public careers/ATS pages only.",
    });
    const html = typeof htmlPage.text === "string" ? htmlPage.text : "";
    if (html.length >= 80) {
      return parseJobFromHtml(htmlPage.final_url || url, html, source, "tinyfish");
    }
  } catch (e) {
    console.warn("TinyFish HTML fetch failed, trying markdown", e);
  }

  const mdPage = await tinyfishFetchOne(url, {
    format: "markdown",
    ttl: 0,
    intent: "Extract clean job description markdown from a public careers page",
  });
  const md = typeof mdPage.text === "string" ? mdPage.text : "";
  return parseJobFromMarkdown(mdPage.final_url || url, md, mdPage, source);
}

async function extractViaNative(url: string, source: string): Promise<ExtractedJob> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CareerOSBot/1.0 (+https://careeros.ai; assisted career discovery)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    throw new Error(`Could not fetch job page (${res.status})`);
  }
  const html = await res.text();
  return parseJobFromHtml(url, html, source, "native");
}

export async function extractJobFromUrl(url: string): Promise<ExtractedJob> {
  if (!isSupportedJobUrl(url)) {
    throw new Error("Invalid job URL");
  }
  const source = detectSource(url);
  if (source === "user_paste_url") {
    throw new Error(
      "LinkedIn/Naukri pages are often login-walled. Paste the job description text instead (assisted apply).",
    );
  }

  if (isTinyFishConfigured()) {
    try {
      return await extractViaTinyFish(url, source);
    } catch (e) {
      console.warn("TinyFish job extract failed, falling back to native", e);
      try {
        return await extractViaNative(url, source);
      } catch {
        throw e instanceof Error ? e : new Error("Could not extract job from URL");
      }
    }
  }

  return extractViaNative(url, source);
}
