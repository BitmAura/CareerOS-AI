/**
 * India industrial OEM scanner via public Workday CXS JSON (no login).
 * Fetches real jobDescription from Workday detail endpoint — never stub JDs.
 */

import { attributeJobSource } from "@/lib/jobs/job-sources";
import { extractJobSignals } from "@/lib/jobs/job-signals";
import {
  oemBoardsForFamily,
  workdayJobDetailUrl,
  workdayJobsUrl,
  type WorkdayOemBoard,
} from "@/lib/jobs/oem-workday-boards";
import {
  indiaRelevantLocation,
  profileKeywordHit,
} from "@/lib/jobs/portal-filters";
import { htmlToPlainText } from "@/lib/jobs/html-plain";
import type { ExtractedJob } from "@/lib/jobs/extract-job-url";
import type { CareerTargets } from "@/lib/db/types";
import {
  inferRoleFamily,
  inferRoleFamilyFromText,
  roleFamiliesCompatible,
} from "@/lib/product/targets";

export type OemScanStats = {
  boardsTried: number;
  boardsOk: number;
  rawJobs: number;
  kept: number;
  rejectedLocation: number;
  rejectedFamily: number;
  detailsFetched?: number;
};

type WorkdayPosting = {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
};

function stripHtml(html: string): string {
  return htmlToPlainText(html);
}

async function fetchWorkdayDetail(
  board: WorkdayOemBoard,
  externalPath: string,
): Promise<string> {
  const path = externalPath.startsWith("/") ? externalPath : `/${externalPath}`;
  const url = `https://${board.host}/wday/cxs/${board.tenant}/${board.site}${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; CareerOSBot/1.0; +https://careeros.local)",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as {
    jobPostingInfo?: { jobDescription?: string; title?: string };
  };
  return stripHtml(data.jobPostingInfo?.jobDescription || "");
}

async function fetchWorkdayBoard(
  board: WorkdayOemBoard,
  searchText: string,
): Promise<Array<WorkdayPosting & { board: WorkdayOemBoard }>> {
  const url = workdayJobsUrl(board);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent":
        "Mozilla/5.0 (compatible; CareerOSBot/1.0; +https://careeros.local)",
    },
    body: JSON.stringify({
      appliedFacets: {},
      limit: 20,
      offset: 0,
      searchText: searchText || "India",
    }),
    signal: AbortSignal.timeout(14_000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { jobPostings?: WorkdayPosting[] };
  return (data.jobPostings || [])
    .filter((p) => p.title && p.externalPath)
    .map((p) => ({ ...p, board }));
}

export async function scanIndiaOemWorkday(opts: {
  targets?: CareerTargets | null;
  limit: number;
  excludeUrls?: Set<string>;
  maxBoards?: number;
}): Promise<{ jobs: ExtractedJob[]; stats: OemScanStats }> {
  const limit = Math.max(0, Math.min(opts.limit, 8));
  const family = inferRoleFamily(opts.targets);
  const stats: OemScanStats = {
    boardsTried: 0,
    boardsOk: 0,
    rawJobs: 0,
    kept: 0,
    rejectedLocation: 0,
    rejectedFamily: 0,
    detailsFetched: 0,
  };
  if (limit <= 0) return { jobs: [], stats };

  const role = opts.targets?.targetRole?.trim() || "";
  const searchText = [role, "India"].filter(Boolean).join(" ").trim() || "India";
  const boards = oemBoardsForFamily(family).slice(0, opts.maxBoards ?? 5);
  const exclude = opts.excludeUrls || new Set<string>();
  const candidates: Array<WorkdayPosting & { board: WorkdayOemBoard }> = [];

  for (let i = 0; i < boards.length; i += 2) {
    if (candidates.length >= limit * 3) break;
    const batch = boards.slice(i, i + 2);
    const results = await Promise.all(
      batch.map(async (board) => {
        stats.boardsTried += 1;
        try {
          return await fetchWorkdayBoard(board, searchText);
        } catch (e) {
          console.warn("OEM Workday fetch failed", board.id, e);
          return [] as Array<WorkdayPosting & { board: WorkdayOemBoard }>;
        }
      }),
    );
    for (const jobs of results) {
      if (jobs.length) stats.boardsOk += 1;
      stats.rawJobs += jobs.length;
      for (const job of jobs) {
        if (!indiaRelevantLocation(job.locationsText || "", opts.targets)) {
          stats.rejectedLocation += 1;
          continue;
        }
        candidates.push(job);
      }
    }
  }

  const kept: ExtractedJob[] = [];
  for (const posting of candidates) {
    if (kept.length >= limit) break;
    const applyUrl = workdayJobDetailUrl(posting.board, posting.externalPath!);
    if (exclude.has(applyUrl)) continue;

    let description = "";
    try {
      description = await fetchWorkdayDetail(posting.board, posting.externalPath!);
      if (description) stats.detailsFetched = (stats.detailsFetched || 0) + 1;
    } catch {
      description = "";
    }
    if (description.length < 120) {
      // Skip stub-quality — don't seat jobs without real JD
      continue;
    }

    const location = posting.locationsText || "";
    const blob = `${posting.title} ${description} ${location}`;
    const jobFamily = inferRoleFamilyFromText(blob);
    if (!roleFamiliesCompatible(family, jobFamily)) {
      stats.rejectedFamily += 1;
      continue;
    }
    if (!profileKeywordHit(blob, opts.targets)) continue;

    const attribution = attributeJobSource(applyUrl, posting.board.company);
    const signals = extractJobSignals({ description });
    kept.push({
      title: posting.title!,
      company: posting.board.company,
      location,
      description: description.slice(0, 12_000),
      applyUrl,
      source: "workday",
      engine: "portal",
      postedAt: signals.postedAt,
      salary: signals.salary,
      salaryLpaMin: signals.salaryLpaMin,
      salaryLpaMax: signals.salaryLpaMax,
      noticeDays: signals.noticeDays,
      roleFamily: jobFamily,
      isJobDetail: true,
      sourceLabel: attribution.label,
      sourcePlatform: "Workday",
      sourcePublisher: posting.board.company,
      sourceOfficial: true,
      discoveredAt: new Date().toISOString(),
    });
    exclude.add(applyUrl);
  }

  stats.kept = kept.length;
  return { jobs: kept, stats };
}
