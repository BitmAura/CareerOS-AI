import { localStore } from "@/lib/db/local-store";
import {
  digestLimitForRun,
  matchContextText,
  todayDigestDate,
} from "@/lib/jobs/digest";
import { discoverLiveJobs, LIVE_ADMISSION_FLOOR, type LiveDiscoverStats } from "@/lib/jobs/live-discover";
import { assessPostingLegitimacy } from "@/lib/jobs/legitimacy";
import { evaluateJobMatch, passesAdmissionFloor } from "@/lib/jobs/match-rubric";
import { encodeQueueNotes, mergeQueueNotes } from "@/lib/jobs/queue-notes";
import { digestSlotForRunIndex, digestSlotLabel, PRODUCT_STANCE } from "@/lib/product/stance";
import {
  inferRoleFamilyFromText,
  jobMatchesTargetLocation,
} from "@/lib/product/targets";
import { tailorResumeForJob } from "@/lib/resume/analyze";
import type { ApplicationQueueItem, DigestRunRecord, JobRecord } from "@/lib/db/types";
import type { MatchRubric } from "@/lib/jobs/match-rubric";

export type DigestRunResult = {
  userId: string;
  date: string;
  created: number;
  slotLabel: string;
  skipped?: string;
  items: ApplicationQueueItem[];
  run?: DigestRunRecord;
  live?: LiveDiscoverStats;
  sources?: { live: number; beachhead: number };
};

/** Local-store digest: live OEM/Workday/TinyFish only. Never invent titles from catalog seeds. */
export async function runLocalUserDigest(opts: {
  userId: string;
  resumeId?: string;
  autoPrepare?: boolean;
  date?: string;
}): Promise<DigestRunResult> {
  const date = opts.date || todayDigestDate();
  const autoPrepare = opts.autoPrepare !== false;
  const existingRuns = await localStore.listDigestRuns(opts.userId, date);

  if (existingRuns.length >= PRODUCT_STANCE.dailyDigestRunsMax) {
    return {
      userId: opts.userId,
      date,
      created: 0,
      slotLabel: digestSlotLabel(digestSlotForRunIndex(existingRuns.length)),
      skipped: `Already ran ${PRODUCT_STANCE.dailyDigestRunsMax} searches today`,
      items: [],
    };
  }

  const existing = await localStore.listQueue(opts.userId, date);
  const limit = digestLimitForRun(existing.length);
  if (limit <= 0) {
    return {
      userId: opts.userId,
      date,
      created: 0,
      slotLabel: digestSlotLabel(digestSlotForRunIndex(existingRuns.length)),
      skipped: `Daily queue full (${PRODUCT_STANCE.dailyQueueCap})`,
      items: [],
    };
  }

  const slot = digestSlotForRunIndex(existingRuns.length);
  const jobs = await localStore.listJobs();
  const apps = await localStore.listApplications(opts.userId);
  const resumes = await localStore.listResumes(opts.userId);
  const resume = opts.resumeId
    ? resumes.find((r) => r.id === opts.resumeId) || null
    : resumes[0] || null;
  const user = await localStore.findUserById(opts.userId);
  const targets = user?.careerTargets || null;
  const profileText = matchContextText(resume, targets);

  const excludeJobIds = new Set<string>([
    ...apps.map((a) => a.jobId),
    ...existing.map((q) => q.jobId),
  ]);
  const excludeUrls = new Set<string>(
    jobs.map((j) => j.sourceUrl).filter(Boolean) as string[],
  );
  for (const q of existing) {
    if (q.applyUrl) excludeUrls.add(q.applyUrl);
    if (q.job?.sourceUrl) excludeUrls.add(q.job.sourceUrl);
  }

  const liveBudget = Math.min(limit, PRODUCT_STANCE.perDigestTarget);
  const { jobs: liveExtracted, stats: liveStats } = await discoverLiveJobs({
    targets,
    resume,
    limit: liveBudget,
    excludeUrls,
  });

  const rankedLive: Array<{ job: JobRecord; matchScore: number; rubric: MatchRubric }> = [];
  for (const extracted of liveExtracted) {
    const job = await localStore.createJob({
      title: extracted.title,
      company: extracted.company,
      location: extracted.location || "India",
      description: extracted.description,
      requirements: [],
      source: extracted.source || "tinyfish_live",
      sourceUrl: extracted.applyUrl,
      sourceKind: "live",
      roleFamily: extracted.roleFamily || inferRoleFamilyFromText(`${extracted.title} ${extracted.description}`),
      postedAt: extracted.postedAt,
      sourceLabel: extracted.sourceLabel,
      sourcePlatform: extracted.sourcePlatform,
      sourcePublisher: extracted.sourcePublisher,
      sourceOfficial: extracted.sourceOfficial,
      discoveredAt: extracted.discoveredAt,
      salary: extracted.salary,
      salaryLpaMin: extracted.salaryLpaMin,
      salaryLpaMax: extracted.salaryLpaMax,
      noticeDays: extracted.noticeDays,
      isActive: true,
    });
    if (excludeJobIds.has(job.id)) continue;
    if (!jobMatchesTargetLocation(job.location, targets)) continue;
    const legit = assessPostingLegitimacy(job);
    if (!legit.ok) continue;
    const baseRubric = evaluateJobMatch(job, profileText, targets);
    if (!passesAdmissionFloor(baseRubric, job, targets, LIVE_ADMISSION_FLOOR)) continue;
    const rubric =
      legit.grade === "warn" && legit.reasons.length
        ? {
            ...baseRubric,
            unknowns: [...(baseRubric.unknowns || []), ...legit.reasons.slice(0, 2)],
          }
        : baseRubric;
    rankedLive.push({ job, matchScore: rubric.score, rubric });
    excludeJobIds.add(job.id);
    if (extracted.applyUrl) excludeUrls.add(extracted.applyUrl);
  }
  rankedLive.sort((a, b) => b.matchScore - a.matchScore);

  const ranked = rankedLive.slice(0, limit);
  const created: ApplicationQueueItem[] = [];

  for (const { job, matchScore, rubric } of ranked) {
    let item = await localStore.createQueueItem({
      userId: opts.userId,
      jobId: job.id,
      digestDate: date,
      matchScore,
      status: "queued",
      digestSlot: slot,
      applyUrl: job.sourceUrl,
      matchRubric: rubric,
      notes: encodeQueueNotes({ rubric, action: rubric.action }),
    });
    if (autoPrepare && resume) {
      const tailored = await tailorResumeForJob(resume.rawText || profileText, {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
      });
      const version = await localStore.createVersion({
        resumeId: resume.id,
        userId: opts.userId,
        name: `Queue packet — ${job.company}`,
        kind: "job_tailored",
        contentMarkdown: tailored.markdown,
        targetJobId: job.id,
        optimizationNotes: tailored.notes,
        aiScore: tailored.aiScore ?? matchScore,
      });
      await localStore.createVersion({
        resumeId: resume.id,
        userId: opts.userId,
        name: `Queue cover — ${job.company}`,
        kind: "cover_letter",
        contentMarkdown: tailored.coverLetter,
        targetJobId: job.id,
      });
      item = (await localStore.updateQueueItem(item.id, {
        status: "prepared",
        tailoredMarkdown: tailored.markdown,
        coverLetter: tailored.coverLetter,
        resumeVersionId: version.id,
        preparedAt: new Date().toISOString(),
        matchRubric: rubric,
        notes: mergeQueueNotes(item.notes, {
          rubric,
          tailorNotes: tailored.notes,
          action: rubric.action,
        }),
      }))!;
      await localStore.bumpValueStats(opts.userId, { packetsPrepared: 1 });
    }
    created.push(item);
  }

  // Do not burn a digest credit when nothing eligible was found
  if (created.length === 0) {
    return {
      userId: opts.userId,
      date,
      created: 0,
      slotLabel: digestSlotLabel(slot),
      skipped:
        "No live OEM/Workday seats this run — credit not used. Paste a real JD URL, or try again. We do not invent job titles.",
      items: [],
      live: liveStats,
      sources: { live: 0, beachhead: 0 },
    };
  }

  const liveCount = rankedLive.filter((r) =>
    created.some((c) => c.jobId === r.job.id),
  ).length;
  const beachheadCount = Math.max(0, created.length - liveCount);

  const run = await localStore.createDigestRun({
    userId: opts.userId,
    digestDate: date,
    slot,
    createdCount: created.length,
    ranAt: new Date().toISOString(),
    sources: { live: liveCount, beachhead: beachheadCount },
  });

  await localStore.bumpValueStats(opts.userId, {
    liveQueued: liveCount,
    beachheadQueued: beachheadCount,
  });

  return {
    userId: opts.userId,
    date,
    created: created.length,
    slotLabel: digestSlotLabel(slot),
    items: created,
    run,
    live: liveStats,
    sources: {
      live: liveCount,
      beachhead: beachheadCount,
    },
  };
}
