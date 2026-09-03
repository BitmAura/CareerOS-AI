/**
 * Supabase-backed digest: live OEM/Workday/Greenhouse/TinyFish only.
 * Never queues catalog seeds (source_url null / source=manual).
 */

import {
  digestLimitForRun,
  isRealQueueOpening,
  profileTextFromResume,
  rankJobsForDigest,
  todayDigestDate,
} from "@/lib/jobs/digest";
import { discoverLiveJobs } from "@/lib/jobs/live-discover";
import { encodeQueueNotes, mergeQueueNotes } from "@/lib/jobs/queue-notes";
import type { LiveDiscoverStats } from "@/lib/jobs/live-discover";
import {
  digestSlotForRunIndex,
  digestSlotLabel,
  PRODUCT_STANCE,
} from "@/lib/product/stance";
import { emptyTargets, normalizeTargets } from "@/lib/product/targets";
import { tailorResumeForJob } from "@/lib/resume/analyze";
import { getServiceSupabase } from "@/lib/supabase/admin";
import type { ApplicationQueueItem, DigestRunRecord } from "@/lib/db/types";

export type SupabaseDigestResult = {
  userId: string;
  date: string;
  created: number;
  slotLabel: string;
  skipped?: string;
  items: ApplicationQueueItem[];
  live?: LiveDiscoverStats;
  sources?: { live: number; beachhead: number };
  message?: string;
};

function mapQueue(
  row: Record<string, unknown>,
  job?: Record<string, unknown>,
): ApplicationQueueItem {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    jobId: String(row.job_id),
    digestDate: String(row.digest_date).slice(0, 10),
    matchScore: Number(row.match_score) || 0,
    status: row.status as ApplicationQueueItem["status"],
    digestSlot: row.digest_slot
      ? (String(row.digest_slot) as ApplicationQueueItem["digestSlot"])
      : undefined,
    tailoredMarkdown: row.tailored_markdown ? String(row.tailored_markdown) : undefined,
    coverLetter: row.cover_letter ? String(row.cover_letter) : undefined,
    resumeVersionId: row.resume_version_id ? String(row.resume_version_id) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    applyUrl: row.apply_url ? String(row.apply_url) : undefined,
    preparedAt: row.prepared_at ? String(row.prepared_at) : undefined,
    approvedAt: row.approved_at ? String(row.approved_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    job: job
      ? {
          id: String(job.id),
          title: String(job.title),
          company: String(job.company),
          location: String(job.location),
          salary: job.salary ? String(job.salary) : undefined,
          description: String(job.description || ""),
          requirements: (job.requirements as string[]) || [],
          source: String(job.source || "manual"),
          sourceUrl: job.source_url ? String(job.source_url) : undefined,
          sourceKind: "live",
          matchScore: job.match_score ? Number(job.match_score) : undefined,
          isActive: Boolean(job.is_active ?? true),
          createdAt: String(job.created_at || ""),
          updatedAt: String(job.updated_at || ""),
        }
      : undefined,
  };
}

export async function runSupabaseUserDigest(opts: {
  userId: string;
  resumeId?: string;
  autoPrepare?: boolean;
  date?: string;
}): Promise<SupabaseDigestResult> {
  const sb = getServiceSupabase();
  if (!sb) {
    return {
      userId: opts.userId,
      date: opts.date || todayDigestDate(),
      created: 0,
      slotLabel: digestSlotLabel("morning"),
      skipped: "Supabase not configured",
      items: [],
    };
  }

  const date = opts.date || todayDigestDate();
  const autoPrepare = opts.autoPrepare === true;

  const { data: runRows } = await sb
    .from("digest_runs")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("digest_date", date);
  const existingRuns: DigestRunRecord[] = (runRows || []).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    digestDate: String(r.digest_date).slice(0, 10),
    slot: r.slot,
    createdCount: Number(r.created_count) || 0,
    ranAt: String(r.ran_at),
  }));
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

  const { data: existingQ } = await sb
    .from("application_queue")
    .select("job_id")
    .eq("user_id", opts.userId)
    .eq("digest_date", date);
  const queuedCount = (existingQ || []).length;
  const limit = digestLimitForRun(queuedCount);
  if (limit <= 0) {
    return {
      userId: opts.userId,
      date,
      created: 0,
      slotLabel: digestSlotLabel(digestSlotForRunIndex(existingRuns.length)),
      skipped: "Daily review queue is full",
      items: [],
    };
  }

  const slot = digestSlotForRunIndex(existingRuns.length);
  const { data: jobsRaw } = await sb.from("jobs").select("*").eq("is_active", true);
  const jobRows: Array<Record<string, unknown>> = [...(jobsRaw || [])];
  const { data: apps } = await sb
    .from("applications")
    .select("job_id")
    .eq("user_id", opts.userId);
  const { data: resumes } = await sb
    .from("resumes")
    .select("*")
    .eq("user_id", opts.userId)
    .order("created_at", { ascending: false });

  const resumeRow = opts.resumeId
    ? (resumes || []).find((r) => r.id === opts.resumeId)
    : (resumes || [])[0];
  const profileText = profileTextFromResume(
    resumeRow
      ? {
          id: resumeRow.id,
          userId: opts.userId,
          fileName: resumeRow.file_name,
          fileUrl: resumeRow.file_url,
          fileSize: resumeRow.file_size,
          mimeType: resumeRow.mime_type,
          rawText: resumeRow.raw_text,
          aiScore: resumeRow.ai_score,
          parsedData: resumeRow.parsed_data,
          suggestions: resumeRow.suggestions,
          status: resumeRow.status,
          createdAt: resumeRow.created_at,
          updatedAt: resumeRow.updated_at,
        }
      : null,
  );

  const { data: profileRow } = await sb
    .from("profiles")
    .select("career_targets")
    .eq("id", opts.userId)
    .maybeSingle();
  const targets = normalizeTargets((profileRow?.career_targets as never) || emptyTargets());

  const exclude = new Set<string>([
    ...(apps || []).map((a) => String(a.job_id)),
    ...(existingQ || []).map((q) => String(q.job_id)),
  ]);

  let liveCount = 0;
  let liveStats: LiveDiscoverStats | undefined;
  try {
    const excludeUrls = new Set(
      jobRows.map((j) => String(j.source_url || "")).filter(Boolean),
    );
    const discovered = await discoverLiveJobs({
      targets,
      resume: resumeRow
        ? ({
            id: resumeRow.id,
            userId: opts.userId,
            fileName: resumeRow.file_name,
            fileUrl: resumeRow.file_url || "",
            fileSize: resumeRow.file_size || 0,
            mimeType: resumeRow.mime_type || "text/plain",
            rawText: resumeRow.raw_text || "",
            status: resumeRow.status,
            createdAt: resumeRow.created_at,
            updatedAt: resumeRow.updated_at,
          } as never)
        : null,
      limit: Math.min(limit, PRODUCT_STANCE.perDigestTarget),
      excludeUrls,
    });
    liveStats = discovered.stats;
    for (const ex of discovered.jobs) {
      if (!ex.applyUrl || !/^https?:\/\//i.test(ex.applyUrl)) continue;
      if (
        jobRows.some(
          (j) => String(j.source_url || "").toLowerCase() === ex.applyUrl.toLowerCase(),
        )
      ) {
        continue;
      }
      const { data: inserted } = await sb
        .from("jobs")
        .insert({
          title: ex.title,
          company: ex.company,
          location: ex.location || "India",
          description: ex.description,
          requirements: [],
          source: ex.source || "portal_live",
          source_url: ex.applyUrl,
          is_active: true,
        })
        .select("*")
        .single();
      if (inserted) {
        liveCount += 1;
        jobRows.push(inserted);
      }
    }
  } catch (e) {
    console.warn("Supabase live discover skipped", e);
  }

  const ranked = rankJobsForDigest(
    jobRows
      .filter((j) => Boolean(j.source_url))
      .map((j) => ({
        id: String(j.id),
        title: String(j.title),
        company: String(j.company),
        location: String(j.location || "India"),
        salary: j.salary ? String(j.salary) : undefined,
        description: String(j.description || ""),
        requirements: (j.requirements as string[]) || [],
        source: String(j.source || "career_page"),
        sourceKind: /tinyfish|workday|portal|greenhouse|lever|ashby|live/.test(
          String(j.source || "").toLowerCase(),
        )
          ? ("live" as const)
          : ("career_page" as const),
        sourceUrl: j.source_url ? String(j.source_url) : undefined,
        matchScore: j.match_score ? Number(j.match_score) : undefined,
        isActive: Boolean(j.is_active),
        createdAt: String(j.created_at || ""),
        updatedAt: String(j.updated_at || ""),
      })),
    profileText,
    exclude,
    limit,
    targets,
  ).filter((row) => isRealQueueOpening(row.job));

  const created: ApplicationQueueItem[] = [];
  for (const { job, matchScore, rubric } of ranked) {
    const { data: row, error } = await sb
      .from("application_queue")
      .insert({
        user_id: opts.userId,
        job_id: job.id,
        digest_date: date,
        match_score: matchScore,
        status: "queued",
        digest_slot: slot,
        apply_url: job.sourceUrl,
        notes: encodeQueueNotes({ rubric, action: rubric.action }),
      })
      .select("*, jobs(*)")
      .single();
    if (error || !row) continue;
    let item = mapQueue(row, row.jobs as Record<string, unknown>);

    if (autoPrepare && resumeRow) {
      try {
        const tailored = await tailorResumeForJob(String(resumeRow.raw_text || profileText), {
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements,
        });
        const { data: version } = await sb
          .from("resume_versions")
          .insert({
            resume_id: resumeRow.id,
            user_id: opts.userId,
            name: `Queue packet — ${job.company}`,
            kind: "job_tailored",
            content_markdown: tailored.markdown,
            target_job_id: job.id,
            optimization_notes: tailored.notes,
            ai_score: tailored.aiScore ?? matchScore,
          })
          .select("id")
          .single();
        await sb.from("resume_versions").insert({
          resume_id: resumeRow.id,
          user_id: opts.userId,
          name: `Queue cover — ${job.company}`,
          kind: "cover_letter",
          content_markdown: tailored.coverLetter,
          target_job_id: job.id,
        });
        const { data: updated } = await sb
          .from("application_queue")
          .update({
            status: "prepared",
            tailored_markdown: tailored.markdown,
            cover_letter: tailored.coverLetter,
            resume_version_id: version?.id,
            prepared_at: new Date().toISOString(),
            notes: mergeQueueNotes(item.notes, {
              rubric,
              tailorNotes: tailored.notes,
              action: rubric.action,
            }),
          })
          .eq("id", item.id)
          .select("*, jobs(*)")
          .single();
        if (updated) item = mapQueue(updated, updated.jobs as Record<string, unknown>);
      } catch (e) {
        console.warn("autoPrepare failed", e);
      }
    }

    created.push(item);
  }

  if (created.length === 0) {
    return {
      userId: opts.userId,
      date,
      created: 0,
      slotLabel: digestSlotLabel(slot),
      skipped:
        "No live OEM/Workday seats this run — credit not used. Paste a real JD URL.",
      items: [],
      live: liveStats,
      sources: { live: 0, beachhead: 0 },
      message:
        "No live OEM/Workday seats this run — credit not used. Paste a real JD URL.",
    };
  }

  await sb.from("digest_runs").insert({
    user_id: opts.userId,
    digest_date: date,
    slot,
    created_count: created.length,
    ran_at: new Date().toISOString(),
  });

  return {
    userId: opts.userId,
    date,
    created: created.length,
    slotLabel: digestSlotLabel(slot),
    items: created,
    live: liveStats,
    sources: { live: liveCount, beachhead: 0 },
    message:
      liveCount > 0
        ? `Live OEM/portal seats: ${liveCount}`
        : liveStats?.searched === false
          ? "No boards returned India-fit seats — paste a real JD URL or set TINYFISH_API_KEY."
          : undefined,
  };
}
