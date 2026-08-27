/**
 * Official ATS board scanner (Greenhouse / Lever / Ashby + India OEM Workday).
 * career-ops pattern: trust structured feeds over open-web scrape, then filter hard.
 */

import { attributeJobSource } from "@/lib/jobs/job-sources";
import { extractJobSignals } from "@/lib/jobs/job-signals";
import { boardsForRoleFamily, type PortalBoard } from "@/lib/jobs/portal-boards";
import {
  indiaRelevantLocation,
  profileKeywordHit,
} from "@/lib/jobs/portal-filters";
import { scanIndiaOemWorkday, type OemScanStats } from "@/lib/jobs/oem-workday-scanner";
import type { ExtractedJob } from "@/lib/jobs/extract-job-url";
import type { CareerTargets } from "@/lib/db/types";
import {
  inferRoleFamily,
  inferRoleFamilyFromText,
  roleFamiliesCompatible,
} from "@/lib/product/targets";

export type PortalScanStats = {
  boardsTried: number;
  boardsOk: number;
  rawJobs: number;
  kept: number;
  rejectedLocation: number;
  rejectedFamily: number;
  oem?: OemScanStats;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchGreenhouse(board: PortalBoard): Promise<ExtractedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs?content=true`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "CareerOSBot/1.0" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      title?: string;
      absolute_url?: string;
      location?: { name?: string };
      updated_at?: string;
      content?: string;
    }>;
  };
  const out: ExtractedJob[] = [];
  for (const job of data.jobs || []) {
    if (!job.absolute_url || !job.title) continue;
    const description = stripHtml(job.content || "") || `${job.title} at ${board.company}`;
    const attribution = attributeJobSource(job.absolute_url, board.company);
    const signals = extractJobSignals({
      description,
      datePosted: job.updated_at,
    });
    out.push({
      title: job.title,
      company: board.company,
      location: job.location?.name || "",
      description: description.slice(0, 12_000),
      applyUrl: job.absolute_url,
      source: "greenhouse",
      engine: "portal",
      postedAt: signals.postedAt || job.updated_at,
      salary: signals.salary,
      salaryLpaMin: signals.salaryLpaMin,
      salaryLpaMax: signals.salaryLpaMax,
      noticeDays: signals.noticeDays,
      roleFamily: inferRoleFamilyFromText(`${job.title} ${description}`),
      isJobDetail: true,
      sourceLabel: attribution.label,
      sourcePlatform: attribution.platform,
      sourcePublisher: attribution.publisher,
      sourceOfficial: attribution.official,
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

async function fetchLever(board: PortalBoard): Promise<ExtractedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(board.token)}?mode=json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "CareerOSBot/1.0" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    text?: string;
    hostedUrl?: string;
    categories?: { location?: string; team?: string; commitment?: string };
    descriptionPlain?: string;
    description?: string;
    createdAt?: number;
  }>;
  const out: ExtractedJob[] = [];
  for (const job of Array.isArray(data) ? data : []) {
    if (!job.hostedUrl || !job.text) continue;
    const description =
      job.descriptionPlain ||
      stripHtml(job.description || "") ||
      `${job.text} at ${board.company}`;
    const attribution = attributeJobSource(job.hostedUrl, board.company);
    const postedAt =
      typeof job.createdAt === "number" ? new Date(job.createdAt).toISOString() : undefined;
    const signals = extractJobSignals({ description, datePosted: postedAt });
    out.push({
      title: job.text,
      company: board.company,
      location: job.categories?.location || "",
      description: description.slice(0, 12_000),
      applyUrl: job.hostedUrl,
      source: "lever",
      engine: "portal",
      postedAt: signals.postedAt || postedAt,
      salary: signals.salary,
      salaryLpaMin: signals.salaryLpaMin,
      salaryLpaMax: signals.salaryLpaMax,
      noticeDays: signals.noticeDays,
      roleFamily: inferRoleFamilyFromText(`${job.text} ${description}`),
      isJobDetail: true,
      sourceLabel: attribution.label,
      sourcePlatform: attribution.platform,
      sourcePublisher: attribution.publisher,
      sourceOfficial: attribution.official,
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

async function fetchAshby(board: PortalBoard): Promise<ExtractedJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.token)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "CareerOSBot/1.0" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    jobs?: Array<{
      title?: string;
      jobUrl?: string;
      location?: string;
      department?: string;
      publishedAt?: string;
      descriptionHtml?: string;
      descriptionPlain?: string;
    }>;
  };
  const out: ExtractedJob[] = [];
  for (const job of data.jobs || []) {
    if (!job.jobUrl || !job.title) continue;
    const description =
      job.descriptionPlain ||
      stripHtml(job.descriptionHtml || "") ||
      `${job.title} at ${board.company}`;
    const attribution = attributeJobSource(job.jobUrl, board.company);
    const signals = extractJobSignals({
      description,
      datePosted: job.publishedAt,
    });
    out.push({
      title: job.title,
      company: board.company,
      location: job.location || "",
      description: description.slice(0, 12_000),
      applyUrl: job.jobUrl,
      source: "ashby",
      engine: "portal",
      postedAt: signals.postedAt || job.publishedAt,
      salary: signals.salary,
      salaryLpaMin: signals.salaryLpaMin,
      salaryLpaMax: signals.salaryLpaMax,
      noticeDays: signals.noticeDays,
      roleFamily: inferRoleFamilyFromText(`${job.title} ${description}`),
      isJobDetail: true,
      sourceLabel: attribution.label,
      sourcePlatform: attribution.platform,
      sourcePublisher: attribution.publisher,
      sourceOfficial: attribution.official,
      discoveredAt: new Date().toISOString(),
    });
  }
  return out;
}

async function fetchBoard(board: PortalBoard): Promise<ExtractedJob[]> {
  try {
    if (board.kind === "greenhouse") return await fetchGreenhouse(board);
    if (board.kind === "lever") return await fetchLever(board);
    return await fetchAshby(board);
  } catch (e) {
    console.warn("Portal board fetch failed", board.id, e);
    return [];
  }
}

export async function scanManufacturingPortals(opts: {
  targets?: CareerTargets | null;
  limit: number;
  excludeUrls?: Set<string>;
  /** Max boards to hit per run (keep digest fast). */
  maxBoards?: number;
}): Promise<{ jobs: ExtractedJob[]; stats: PortalScanStats }> {
  const limit = Math.max(0, Math.min(opts.limit, 8));
  const family = inferRoleFamily(opts.targets);
  const stats: PortalScanStats = {
    boardsTried: 0,
    boardsOk: 0,
    rawJobs: 0,
    kept: 0,
    rejectedLocation: 0,
    rejectedFamily: 0,
  };
  if (limit <= 0) return { jobs: [], stats };

  const exclude = opts.excludeUrls || new Set<string>();
  const kept: ExtractedJob[] = [];

  // 0) India industrial OEM Workday first (JCI / KONE / Shell / Flowserve / Philips)
  const oem = await scanIndiaOemWorkday({
    targets: opts.targets,
    limit,
    excludeUrls: exclude,
    maxBoards: 5,
  });
  stats.oem = oem.stats;
  stats.boardsTried += oem.stats.boardsTried;
  stats.boardsOk += oem.stats.boardsOk;
  stats.rawJobs += oem.stats.rawJobs;
  stats.rejectedLocation += oem.stats.rejectedLocation;
  stats.rejectedFamily += oem.stats.rejectedFamily;
  for (const job of oem.jobs) {
    if (kept.length >= limit) break;
    kept.push(job);
    exclude.add(job.applyUrl);
  }

  const boards = boardsForRoleFamily(family).slice(0, opts.maxBoards ?? 8);

  // Parallel fetch in small batches
  for (let i = 0; i < boards.length; i += 3) {
    if (kept.length >= limit) break;
    const batch = boards.slice(i, i + 3);
    const results = await Promise.all(batch.map((b) => {
      stats.boardsTried += 1;
      return fetchBoard(b).then((jobs) => ({ board: b, jobs }));
    }));
    for (const { jobs } of results) {
      if (jobs.length) stats.boardsOk += 1;
      stats.rawJobs += jobs.length;
      for (const job of jobs) {
        if (kept.length >= limit) break;
        if (exclude.has(job.applyUrl)) continue;
        if (!indiaRelevantLocation(job.location, opts.targets)) {
          stats.rejectedLocation += 1;
          continue;
        }
        const jobFamily =
          job.roleFamily || inferRoleFamilyFromText(`${job.title} ${job.description}`);
        if (!roleFamiliesCompatible(family, jobFamily)) {
          stats.rejectedFamily += 1;
          continue;
        }
        const blob = `${job.title} ${job.description} ${job.location}`;
        if (!profileKeywordHit(blob, opts.targets)) continue;
        kept.push({ ...job, roleFamily: jobFamily });
        exclude.add(job.applyUrl);
      }
    }
  }

  stats.kept = kept.length;
  return { jobs: kept.slice(0, limit), stats };
}
