/**
 * Live job discovery: official ATS portal feeds first, TinyFish Search backup.
 * Queries / boards driven by Profile career targets.
 * Never LinkedIn/Naukri login-wall scrape.
 */

import {
  isTinyFishConfigured,
  tinyfishSearch,
  type TinyFishSearchHit,
} from "@/lib/engines/tinyfish";
import {
  extractJobFromUrl,
  isJobDetailUrl,
  type ExtractedJob,
} from "@/lib/jobs/extract-job-url";
import { assessPostingLegitimacy } from "@/lib/jobs/legitimacy";
import { scanManufacturingPortals, type PortalScanStats } from "@/lib/jobs/portal-scanner";
import type { CareerTargets, ResumeRecord } from "@/lib/db/types";
import {
  isKnownOfficialSource,
  manufacturingSourceSearchClauses,
} from "@/lib/jobs/job-sources";
import {
  hasUsableTargets,
  inferRoleFamily,
  packKeywordsForTargets,
  roleFamiliesCompatible,
} from "@/lib/product/targets";

const BLOCKED_HOST_PARTS = [
  "linkedin.com",
  "naukri.com",
  "indeed.com",
  "glassdoor.",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "reddit.com",
  "quora.com",
  "shine.com",
  "monsterindia.com",
  "timesjobs.com",
  "foundit.in",
  "apna.co",
  "internshala.com",
];

const ATS_OR_CAREERS_HINT =
  /greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|workday\.com|ripplehire\.com|zwayam\.com|turbohire\.|successfactors\.|taleo\.|icims\.com|jobvite\.|smartrecruiters\.|bamboohr\.|careers\.|jobs\.siemens\.com|careers\.se\.com|careers\.abb|\/careers|\/jobs\/|joblisting|work-with-us|vacancies|recruitment/i;

/** Minimum match grade score to admit a live job into the digest. */
export const LIVE_ADMISSION_FLOOR = 58;

export type LiveDiscoverStats = {
  engine: "portal" | "tinyfish" | "hybrid" | "none";
  searched: boolean;
  hits: number;
  blocked: number;
  fetched: number;
  failed: number;
  rejectedHomepage?: number;
  rejectedFamily?: number;
  rejectedLegitimacy?: number;
  query: string;
  queries?: string[];
  roleFamily?: string;
  targetsReady?: boolean;
  portal?: PortalScanStats;
};

export function isBlockedDiscoveryHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return BLOCKED_HOST_PARTS.some((b) => host.includes(b));
  } catch {
    return true;
  }
}

/**
 * Public careers/ATS URL that looks like a specific posting (not a homepage).
 */
export function isUsablePublicJobUrl(url: string): boolean {
  if (!url || isBlockedDiscoveryHost(url)) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const hintOk =
      ATS_OR_CAREERS_HINT.test(u.href) ||
      ATS_OR_CAREERS_HINT.test(u.hostname) ||
      isKnownOfficialSource(url);
    if (!hintOk) return false;
    return isJobDetailUrl(url);
  } catch {
    return false;
  }
}

/**
 * Build TinyFish queries from Profile targets.
 * No hardcoded SAP/Procurement unless that is the inferred role family.
 */
export function buildDigestSearchQueries(
  targets: CareerTargets | null | undefined,
  _resume?: ResumeRecord | null,
): string[] {
  void _resume;
  const ready = hasUsableTargets(targets);
  const family = inferRoleFamily(targets);
  const role =
    targets?.targetRole?.trim() ||
    (family === "sales"
      ? "Regional Sales Manager OR Key Account Manager manufacturing"
      : family === "plant_ops"
        ? "Production Manager OR Plant Manager manufacturing"
        : family === "healthcare"
          ? "Clinical OR Hospital Consultant"
          : "Procurement Manager OR Purchase Manager OR Supply Chain Manager");

  const pack = packKeywordsForTargets(targets);
  const years =
    targets?.yearsExperience && targets.yearsExperience > 0
      ? `${targets.yearsExperience} years`
      : "";
  const cities = (targets?.cities || []).slice(0, 2);
  const ctcBits =
    targets?.ctcMinLpa || targets?.ctcMaxLpa
      ? `${targets.ctcMinLpa || ""}${targets.ctcMinLpa && targets.ctcMaxLpa ? "-" : ""}${targets.ctcMaxLpa || ""} LPA`.trim()
      : "";
  const noticeBits =
    targets?.noticeDays != null && targets.noticeDays > 0
      ? `${targets.noticeDays} days notice`
      : "";
  const sourceClauses = manufacturingSourceSearchClauses(family);

  if (!ready) {
    return [
      `${role} ${pack} India careers -naukri -linkedin`,
      `${role} India careers apply -naukri -linkedin -indeed`,
    ];
  }

  const queries: string[] = [
    `${role} ${pack} ${cities.join(" OR ")} India careers ${years} ${ctcBits} ${noticeBits}`
      .replace(/\s+/g, " ")
      .trim(),
    `${role} India ${sourceClauses[0]}`
      .replace(/\s+/g, " ")
      .trim(),
    `${role} India ${sourceClauses[1]}`.replace(/\s+/g, " ").trim(),
  ];

  if (sourceClauses[2]) {
    queries.push(`${role} India ${sourceClauses[2]}`.replace(/\s+/g, " ").trim());
  } else if (cities.length) {
    queries.push(
      `${role} ${cities.join(" OR ")} manufacturing careers -naukri -linkedin ${noticeBits}`
        .replace(/\s+/g, " ")
        .trim(),
    );
  } else if (noticeBits) {
    queries.push(`${role} ${noticeBits} India careers -naukri -linkedin`.replace(/\s+/g, " ").trim());
  }

  return [...new Set(queries)].slice(0, 4);
}

function hitUrl(hit: TinyFishSearchHit): string | null {
  const u = (hit.url || "").trim();
  return u || null;
}

function admitExtracted(
  extracted: ExtractedJob,
  family: ReturnType<typeof inferRoleFamily>,
): { ok: true; job: ExtractedJob } | { ok: false; reason: "family" | "legitimacy" | "thin" } {
  if ((extracted.description || "").length < 80) return { ok: false, reason: "thin" };
  const jobFamily = extracted.roleFamily || family;
  if (!roleFamiliesCompatible(family, jobFamily)) return { ok: false, reason: "family" };
  const legit = assessPostingLegitimacy(extracted);
  if (!legit.ok) return { ok: false, reason: "legitimacy" };
  return {
    ok: true,
    job: {
      ...extracted,
      roleFamily: jobFamily,
    },
  };
}

async function discoverViaTinyFish(opts: {
  targets?: CareerTargets | null;
  resume?: ResumeRecord | null;
  limit: number;
  excludeUrls: Set<string>;
  family: ReturnType<typeof inferRoleFamily>;
}): Promise<{
  jobs: ExtractedJob[];
  hits: number;
  blocked: number;
  fetched: number;
  failed: number;
  rejectedHomepage: number;
  rejectedFamily: number;
  rejectedLegitimacy: number;
  query: string;
  queries: string[];
}> {
  const queries = buildDigestSearchQueries(opts.targets, opts.resume);
  const candidates: string[] = [];
  let hits = 0;
  let blocked = 0;
  let rejectedHomepage = 0;
  let queryUsed = queries[0] || "";

  for (const q of queries) {
    queryUsed = q;
    try {
      const results = await tinyfishSearch(q, { numResults: 8 });
      hits += results.length;
      for (const hit of results) {
        const url = hitUrl(hit);
        if (!url) continue;
        if (opts.excludeUrls.has(url) || candidates.includes(url)) continue;
        if (
          isBlockedDiscoveryHost(url) ||
          (!ATS_OR_CAREERS_HINT.test(url) && !isKnownOfficialSource(url))
        ) {
          blocked += 1;
          continue;
        }
        if (!isJobDetailUrl(url)) {
          rejectedHomepage += 1;
          blocked += 1;
          continue;
        }
        candidates.push(url);
        if (candidates.length >= opts.limit * 3) break;
      }
    } catch (e) {
      console.warn("TinyFish search query failed", q, e);
    }
    if (candidates.length >= opts.limit * 3) break;
  }

  const jobs: ExtractedJob[] = [];
  let fetched = 0;
  let failed = 0;
  let rejectedFamily = 0;
  let rejectedLegitimacy = 0;

  for (const url of candidates) {
    if (jobs.length >= opts.limit) break;
    try {
      const extracted = await extractJobFromUrl(url);
      if (extracted.isJobDetail === false && !isJobDetailUrl(url)) {
        rejectedHomepage += 1;
        continue;
      }
      const admitted = admitExtracted(
        {
          ...extracted,
          source: extracted.source === "career_page" ? "tinyfish_live" : extracted.source,
          engine: extracted.engine || "tinyfish",
        },
        opts.family,
      );
      if (!admitted.ok) {
        if (admitted.reason === "family") rejectedFamily += 1;
        else if (admitted.reason === "legitimacy") rejectedLegitimacy += 1;
        else failed += 1;
        continue;
      }
      jobs.push(admitted.job);
      fetched += 1;
      opts.excludeUrls.add(url);
    } catch (e) {
      failed += 1;
      console.warn("TinyFish live fetch failed", url, e);
    }
  }

  return {
    jobs,
    hits,
    blocked,
    fetched,
    failed,
    rejectedHomepage,
    rejectedFamily,
    rejectedLegitimacy,
    query: queryUsed,
    queries,
  };
}

export async function discoverLiveJobs(opts: {
  targets?: CareerTargets | null;
  resume?: ResumeRecord | null;
  limit: number;
  excludeUrls?: Set<string>;
}): Promise<{ jobs: ExtractedJob[]; stats: LiveDiscoverStats }> {
  const limit = Math.max(0, Math.min(opts.limit, 6));
  const family = inferRoleFamily(opts.targets);
  const exclude = opts.excludeUrls || new Set<string>();
  const empty: LiveDiscoverStats = {
    engine: "none",
    searched: false,
    hits: 0,
    blocked: 0,
    fetched: 0,
    failed: 0,
    rejectedHomepage: 0,
    rejectedFamily: 0,
    rejectedLegitimacy: 0,
    query: "",
    roleFamily: family,
    targetsReady: hasUsableTargets(opts.targets),
  };

  if (limit <= 0) {
    return { jobs: [], stats: empty };
  }

  // 1) Official ATS portal feeds (works without TinyFish)
  const portal = await scanManufacturingPortals({
    targets: opts.targets,
    limit,
    excludeUrls: exclude,
    maxBoards: 8,
  });
  const jobs: ExtractedJob[] = [];
  let rejectedFamily = 0;
  let rejectedLegitimacy = 0;
  let failed = 0;

  for (const extracted of portal.jobs) {
    if (jobs.length >= limit) break;
    const admitted = admitExtracted(extracted, family);
    if (!admitted.ok) {
      if (admitted.reason === "family") rejectedFamily += 1;
      else if (admitted.reason === "legitimacy") rejectedLegitimacy += 1;
      else failed += 1;
      continue;
    }
    jobs.push(admitted.job);
    exclude.add(admitted.job.applyUrl);
  }

  // 2) TinyFish backup for remaining seats
  let tf:
    | Awaited<ReturnType<typeof discoverViaTinyFish>>
    | null = null;
  const remaining = limit - jobs.length;
  if (remaining > 0 && isTinyFishConfigured()) {
    tf = await discoverViaTinyFish({
      targets: opts.targets,
      resume: opts.resume,
      limit: remaining,
      excludeUrls: exclude,
      family,
    });
    jobs.push(...tf.jobs);
  }

  const usedPortal = portal.stats.kept > 0 || portal.stats.boardsTried > 0;
  const usedTf = Boolean(tf?.queries?.length);
  const engine: LiveDiscoverStats["engine"] =
    usedPortal && usedTf ? "hybrid" : usedPortal ? "portal" : usedTf ? "tinyfish" : "none";

  return {
    jobs: jobs.slice(0, limit),
    stats: {
      engine,
      searched: usedPortal || usedTf,
      hits: (tf?.hits || 0) + portal.stats.rawJobs,
      blocked: tf?.blocked || 0,
      fetched: jobs.length,
      failed: failed + (tf?.failed || 0),
      rejectedHomepage: tf?.rejectedHomepage || 0,
      rejectedFamily: rejectedFamily + (tf?.rejectedFamily || 0) + portal.stats.rejectedFamily,
      rejectedLegitimacy: rejectedLegitimacy + (tf?.rejectedLegitimacy || 0),
      query: tf?.query || "portal-scan",
      queries: tf?.queries,
      roleFamily: family,
      targetsReady: hasUsableTargets(opts.targets),
      portal: portal.stats,
    },
  };
}
