import type { CareerTargets, JobRecord, ParsedResume, ResumeRecord } from "@/lib/db/types";
import {
  evaluateJobMatch,
  passesAdmissionFloor,
  type MatchRubric,
} from "@/lib/jobs/match-rubric";
import {
  inferRoleFamily,
  inferRoleFamilyFromText,
  jobMatchesTargetLocation,
  roleFamiliesCompatible,
  targetsToSearchText,
} from "@/lib/product/targets";
import { PRODUCT_STANCE } from "@/lib/product/stance";

export type { MatchRubric };

export function todayDigestDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function profileTextFromResume(resume: ResumeRecord | null | undefined): string {
  if (!resume) return "";
  const p = resume.parsedData || ({} as ParsedResume);
  const parts = [
    resume.rawText || "",
    p.summary || "",
    (p.skills || []).join(" "),
    ...(p.experience || []).flatMap((e) => [
      e.role || "",
      e.company || "",
      ...(e.bullets || []),
    ]),
  ];
  return parts.join(" ").toLowerCase();
}

export function matchContextText(
  resume: ResumeRecord | null | undefined,
  targets?: CareerTargets | null,
): string {
  return `${profileTextFromResume(resume)} ${targetsToSearchText(targets)}`.trim();
}

export function scoreJobAgainstProfile(
  job: JobRecord,
  profileText: string,
  targets?: CareerTargets | null,
): number {
  return evaluateJobMatch(job, profileText, targets).score;
}

/** Invented catalog rows (fake title + homepage URL) must never sit in Daily queue. */
export function isRealQueueOpening(job?: Pick<JobRecord, "sourceKind" | "source"> | null): boolean {
  if (!job) return false;
  if (job.sourceKind === "live" || job.sourceKind === "paste") return true;
  const src = (job.source || "").toLowerCase();
  return /tinyfish|portal|workday|greenhouse|lever|ashby/.test(src);
}

export function rankJobsForDigest(
  jobs: JobRecord[],
  profileText: string,
  excludeJobIds: Set<string>,
  limit: number = PRODUCT_STANCE.perDigestTarget,
  targets?: CareerTargets | null,
): Array<{ job: JobRecord; matchScore: number; rubric: MatchRubric }> {
  const family = inferRoleFamily(targets);
  return jobs
    .filter((j) => j.isActive && !excludeJobIds.has(j.id))
    .filter((j) => jobMatchesTargetLocation(j.location, targets))
    .filter((j) => {
      const jobFamily =
        j.roleFamily || inferRoleFamilyFromText(`${j.title} ${j.description}`);
      return roleFamiliesCompatible(family, jobFamily);
    })
    .map((job) => {
      const rubric = evaluateJobMatch(job, profileText, targets);
      return { job, matchScore: rubric.score, rubric };
    })
    .filter((row) => passesAdmissionFloor(row.rubric, row.job, targets))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, Math.max(0, limit));
}

export function remainingQueueSeats(alreadyQueuedToday: number): number {
  return Math.max(0, PRODUCT_STANCE.dailyQueueCap - alreadyQueuedToday);
}

export function digestLimitForRun(alreadyQueuedToday: number): number {
  const seats = remainingQueueSeats(alreadyQueuedToday);
  return Math.min(PRODUCT_STANCE.perDigestTarget, seats);
}
