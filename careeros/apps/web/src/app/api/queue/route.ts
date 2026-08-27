import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import {
  digestLimitForRun,
  profileTextFromResume,
  rankJobsForDigest,
  remainingQueueSeats,
  todayDigestDate,
} from "@/lib/jobs/digest";
import { evaluateJobMatch } from "@/lib/jobs/match-rubric";
import { encodeQueueNotes, mergeQueueNotes, parseQueueNotes } from "@/lib/jobs/queue-notes";
import { emptyTargets, inferRoleFamilyFromText, normalizeTargets } from "@/lib/product/targets";
import { runLocalUserDigest } from "@/lib/jobs/run-digest";
import { digestSlotForRunIndex, digestSlotLabel, PRODUCT_STANCE } from "@/lib/product/stance";
import { tailorResumeForJob } from "@/lib/resume/analyze";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { ApplicationQueueItem, DigestRunRecord, MatchRubricSnapshot } from "@/lib/db/types";

function parseRubricNotes(notes?: string | null): MatchRubricSnapshot | undefined {
  return parseQueueNotes(notes).rubric;
}

export const maxDuration = 120;

function mapSbQueue(row: Record<string, unknown>, job?: Record<string, unknown>): ApplicationQueueItem {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    jobId: String(row.job_id),
    digestDate: String(row.digest_date).slice(0, 10),
    matchScore: Number(row.match_score) || 0,
    status: row.status as ApplicationQueueItem["status"],
    digestSlot: row.digest_slot ? (String(row.digest_slot) as ApplicationQueueItem["digestSlot"]) : undefined,
    tailoredMarkdown: row.tailored_markdown ? String(row.tailored_markdown) : undefined,
    coverLetter: row.cover_letter ? String(row.cover_letter) : undefined,
    resumeVersionId: row.resume_version_id ? String(row.resume_version_id) : undefined,
    notes: (() => {
      const parsed = parseQueueNotes(row.notes ? String(row.notes) : null);
      return parsed.action || parsed.tailorNotes || (row.notes ? String(row.notes) : undefined);
    })(),
    matchRubric: parseRubricNotes(row.notes ? String(row.notes) : null),
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
          matchScore: job.match_score ? Number(job.match_score) : undefined,
          isActive: Boolean(job.is_active ?? true),
          createdAt: String(job.created_at || ""),
          updatedAt: String(job.updated_at || ""),
        }
      : undefined,
  };
}

function stancePayload(runs: DigestRunRecord[], queuedToday: number) {
  const runsUsed = runs.length;
  const nextSlot = digestSlotForRunIndex(runsUsed);
  return {
    stance: {
      dailyDigestRunsMax: PRODUCT_STANCE.dailyDigestRunsMax,
      dailyQueueCap: PRODUCT_STANCE.dailyQueueCap,
      assistedApplyOnly: PRODUCT_STANCE.assistedApplyOnly,
      fullWebScrape: PRODUCT_STANCE.fullWebScrape,
      atsLabel: PRODUCT_STANCE.atsLabel,
    },
    runsUsed,
    runsRemaining: Math.max(0, PRODUCT_STANCE.dailyDigestRunsMax - runsUsed),
    seatsUsed: queuedToday,
    seatsRemaining: remainingQueueSeats(queuedToday),
    nextSlot,
    nextSlotLabel: digestSlotLabel(nextSlot),
    canRunDigest:
      runsUsed < PRODUCT_STANCE.dailyDigestRunsMax && remainingQueueSeats(queuedToday) > 0,
  };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const date = url.searchParams.get("date") || todayDigestDate();

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb
      .from("application_queue")
      .select("*, jobs(*)")
      .eq("user_id", user.id)
      .eq("digest_date", date)
      .order("match_score", { ascending: false });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    const items = (data || []).map((r) => mapSbQueue(r, r.jobs as Record<string, unknown>));
    const { data: runRows } = await sb
      .from("digest_runs")
      .select("*")
      .eq("user_id", user.id)
      .eq("digest_date", date)
      .order("ran_at", { ascending: true });
    const runs: DigestRunRecord[] = (runRows || []).map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      digestDate: String(r.digest_date).slice(0, 10),
      slot: r.slot,
      createdCount: Number(r.created_count) || 0,
      ranAt: String(r.ran_at),
    }));
    return NextResponse.json({
      date,
      items,
      runs,
      ...stancePayload(runs, items.length),
    });
  }

  const items = await localStore.listQueue(user.id, date);
  const resumes = await localStore.listResumes(user.id);
  const profileText = profileTextFromResume(resumes[0]);
  const userRow = await localStore.findUserById(user.id);
  const targets = userRow?.careerTargets || null;
  const enriched = await Promise.all(
    items.map(async (item) => {
      if (item.matchRubric || !item.job) return item;
      const rubric = evaluateJobMatch(item.job, profileText, targets);
      return (
        (await localStore.updateQueueItem(item.id, {
          matchRubric: rubric,
          matchScore: rubric.score,
          notes: item.notes || rubric.action,
        })) || { ...item, matchRubric: rubric, matchScore: rubric.score }
      );
    }),
  );
  const runs = await localStore.listDigestRuns(user.id, date);
  return NextResponse.json({
    date,
    items: enriched,
    runs,
    ...stancePayload(runs, enriched.length),
  });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "digest");
  const date = String(body.date || todayDigestDate());
  const autoPrepare = body.autoPrepare !== false;
  const resumeId = body.resumeId ? String(body.resumeId) : "";

  if (action === "paste") {
    return handlePaste(user.id, body, date);
  }

  if (action === "ingest_alert") {
    const { ingestAlertOrPaste } = await import("@/lib/jobs/alert-ingest");
    const { isUsablePublicJobUrl, isBlockedDiscoveryHost } = await import(
      "@/lib/jobs/live-discover"
    );
    const text = String(body.text || body.description || body.jd || "");
    const ingested = ingestAlertOrPaste(text);
    if (!ingested.urls.length && !text.trim()) {
      return NextResponse.json(
        { message: "Paste a LinkedIn/Naukri job alert email or a JD with links" },
        { status: 400 },
      );
    }
    // Prefer official/public ATS URLs; if only LinkedIn/Naukri, keep text paste path
    const publicUrl = ingested.urls.find(
      (u) => isUsablePublicJobUrl(u) || (!isBlockedDiscoveryHost(u) && /careers|jobs\./i.test(u)),
    );
    if (publicUrl) {
      try {
        const { extractJobFromUrl } = await import("@/lib/jobs/extract-job-url");
        const extracted = await extractJobFromUrl(publicUrl);
        const pastedRes = await handlePaste(
          user.id,
          {
            title: extracted.title,
            company: extracted.company,
            location: extracted.location,
            description: extracted.description || text.slice(0, 8000),
            applyUrl: extracted.applyUrl,
            source: extracted.source,
            sourceKind: "career_page",
            sourceLabel: extracted.sourceLabel,
            sourcePlatform: extracted.sourcePlatform,
            sourcePublisher: extracted.sourcePublisher,
            sourceOfficial: extracted.sourceOfficial,
            discoveredAt: extracted.discoveredAt,
            postedAt: extracted.postedAt,
            salary: extracted.salary,
            salaryLpaMin: extracted.salaryLpaMin,
            salaryLpaMax: extracted.salaryLpaMax,
            noticeDays: extracted.noticeDays,
          },
          date,
        );
        const payload = await pastedRes.json();
        return NextResponse.json(
          {
            ...payload,
            engine: extracted.engine || "native",
            alertIngest: ingested,
          },
          { status: pastedRes.status },
        );
      } catch (e) {
        /* fall through to text paste */
        console.warn("Alert URL extract failed", publicUrl, e);
      }
    }
    const pastedRes = await handlePaste(
      user.id,
      {
        title: String(body.title || "Alert / pasted role"),
        company: String(body.company || "From job alert"),
        description: text.slice(0, 8000),
        applyUrl: ingested.urls[0],
        source: "user_paste",
        sourceKind: "paste",
      },
      date,
    );
    const payload = await pastedRes.json();
    return NextResponse.json(
      { ...payload, alertIngest: ingested },
      { status: pastedRes.status },
    );
  }

  if (action === "extract_url") {
    const applyUrl = String(body.applyUrl || body.url || "");
    if (!applyUrl) {
      return NextResponse.json({ message: "applyUrl required" }, { status: 400 });
    }
    try {
      const { extractJobFromUrl } = await import("@/lib/jobs/extract-job-url");
      const extracted = await extractJobFromUrl(applyUrl);
      const pastedRes = await handlePaste(
        user.id,
        {
          title: extracted.title,
          company: extracted.company,
          location: extracted.location,
          description: extracted.description,
          applyUrl: extracted.applyUrl,
          source: extracted.source,
          sourceKind: "career_page",
          sourceLabel: extracted.sourceLabel,
          sourcePlatform: extracted.sourcePlatform,
          sourcePublisher: extracted.sourcePublisher,
          sourceOfficial: extracted.sourceOfficial,
          discoveredAt: extracted.discoveredAt,
          postedAt: extracted.postedAt,
          salary: extracted.salary,
          salaryLpaMin: extracted.salaryLpaMin,
          salaryLpaMax: extracted.salaryLpaMax,
          noticeDays: extracted.noticeDays,
        },
        date,
      );
      const payload = await pastedRes.json();
      return NextResponse.json(
        { ...payload, engine: extracted.engine || "native" },
        { status: pastedRes.status },
      );
    } catch (e) {
      return NextResponse.json(
        { message: e instanceof Error ? e.message : "Extract failed" },
        { status: 400 },
      );
    }
  }

  // Local digest (primary path for free-tier)
  if (!isSupabaseConfigured()) {
    const result = await runLocalUserDigest({
      userId: user.id,
      resumeId: resumeId || undefined,
      autoPrepare,
      date,
    });
    if (result.skipped) {
      const existingRuns = await localStore.listDigestRuns(user.id, date);
      const existing = await localStore.listQueue(user.id, date);
      return NextResponse.json(
        {
          message: result.skipped,
          ...stancePayload(existingRuns, existing.length),
        },
        { status: 429 },
      );
    }
    const allItems = await localStore.listQueue(user.id, date);
    const runs = await localStore.listDigestRuns(user.id, date);
    return NextResponse.json({
      date: result.date,
      created: result.created,
      items: result.items,
      run: result.run,
      slotLabel: result.slotLabel,
      live: result.live,
      sources: result.sources,
      message:
        result.created === 0
          ? "Search ran — no new public careers matches. Paste a JD or try again after updating Profile targets."
          : result.sources?.live
            ? `Live TinyFish: ${result.sources.live} · beachhead fill: ${result.sources.beachhead}`
            : result.live?.searched === false
              ? "Beachhead seeds only — set TINYFISH_API_KEY for live public careers search."
              : undefined,
      ...stancePayload(runs, allItems.length),
    });
  }

  // Supabase path
  const sb = getServiceSupabase()!;
  const { data: runRows } = await sb
    .from("digest_runs")
    .select("*")
    .eq("user_id", user.id)
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
    return NextResponse.json(
      { message: `Already ran ${PRODUCT_STANCE.dailyDigestRunsMax} searches today.`, ...stancePayload(existingRuns, 0) },
      { status: 429 },
    );
  }

  const { data: existingQ } = await sb
    .from("application_queue")
    .select("job_id")
    .eq("user_id", user.id)
    .eq("digest_date", date);
  const queuedCount = (existingQ || []).length;
  const limit = digestLimitForRun(queuedCount);
  if (limit <= 0) {
    return NextResponse.json(
      { message: "Daily review queue is full.", ...stancePayload(existingRuns, queuedCount) },
      { status: 429 },
    );
  }

  const slot = digestSlotForRunIndex(existingRuns.length);
  const { data: jobsRaw } = await sb.from("jobs").select("*").eq("is_active", true);
  const jobRows: Array<Record<string, unknown>> = [...(jobsRaw || [])];
  const { data: apps } = await sb.from("applications").select("job_id").eq("user_id", user.id);
  const { data: resumes } = await sb
    .from("resumes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const resumeRow = resumeId
    ? (resumes || []).find((r) => r.id === resumeId)
    : (resumes || [])[0];
  const profileText = profileTextFromResume(
    resumeRow
      ? {
          id: resumeRow.id,
          userId: user.id,
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
    .eq("id", user.id)
    .maybeSingle();
  const targets = normalizeTargets((profileRow?.career_targets as never) || emptyTargets());

  const exclude = new Set<string>([
    ...(apps || []).map((a) => String(a.job_id)),
    ...(existingQ || []).map((q) => String(q.job_id)),
  ]);

  // Live TinyFish → insert public careers jobs into Supabase pool
  let liveCount = 0;
  let liveStats: Awaited<ReturnType<typeof import("@/lib/jobs/live-discover").discoverLiveJobs>>["stats"] | undefined;
  try {
    const { discoverLiveJobs } = await import("@/lib/jobs/live-discover");
    const excludeUrls = new Set(
      jobRows.map((j) => String(j.source_url || "")).filter(Boolean),
    );
    const resumeForLive = resumeRow
      ? {
          id: resumeRow.id,
          userId: user.id,
          fileName: resumeRow.file_name,
          fileUrl: resumeRow.file_url || "",
          fileSize: resumeRow.file_size || 0,
          mimeType: resumeRow.mime_type || "text/plain",
          rawText: resumeRow.raw_text || "",
          status: resumeRow.status,
          createdAt: resumeRow.created_at,
          updatedAt: resumeRow.updated_at,
        }
      : null;
    const discovered = await discoverLiveJobs({
      targets,
      resume: resumeForLive as never,
      limit: Math.min(limit, PRODUCT_STANCE.perDigestTarget),
      excludeUrls,
    });
    liveStats = discovered.stats;
    for (const ex of discovered.jobs) {
      const { data: inserted } = await sb
        .from("jobs")
        .insert({
          title: ex.title,
          company: ex.company,
          location: ex.location || "India",
          description: ex.description,
          requirements: [],
          source: ex.source || "tinyfish_live",
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
    jobRows.map((j) => ({
      id: String(j.id),
      title: String(j.title),
      company: String(j.company),
      location: String(j.location || "India"),
      salary: j.salary ? String(j.salary) : undefined,
      description: String(j.description || ""),
      requirements: (j.requirements as string[]) || [],
      source: String(j.source || "career_page"),
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
  );

  const created: ApplicationQueueItem[] = [];
  for (const { job, matchScore, rubric } of ranked) {
    const { data: row, error } = await sb
      .from("application_queue")
      .insert({
        user_id: user.id,
        job_id: job.id,
        digest_date: date,
        match_score: matchScore,
        status: "queued",
        digest_slot: slot,
        apply_url: job.sourceUrl,
        notes: JSON.stringify(rubric),
      })
      .select("*, jobs(*)")
      .single();
    if (error || !row) continue;
    let item = mapSbQueue(row, row.jobs as Record<string, unknown>);
    if (autoPrepare && resumeRow) {
      item = (await prepareItemSupabase(user.id, item, resumeRow)) || item;
    }
    created.push(item);
  }

  await sb.from("digest_runs").insert({
    user_id: user.id,
    digest_date: date,
    slot,
    created_count: created.length,
    ran_at: new Date().toISOString(),
  });

  return NextResponse.json({
    date,
    created: created.length,
    items: created,
    slotLabel: digestSlotLabel(slot),
    live: liveStats,
    sources: { live: liveCount, beachhead: Math.max(0, created.length - liveCount) },
    message:
      liveCount > 0
        ? `Live TinyFish: ${liveCount} · remaining from catalog`
        : liveStats?.searched === false
          ? "Catalog only — set TINYFISH_API_KEY for live public careers search."
          : undefined,
    ...stancePayload(
      [
        ...existingRuns,
        {
          id: "new",
          userId: user.id,
          digestDate: date,
          slot,
          createdCount: created.length,
          ranAt: new Date().toISOString(),
        },
      ],
      queuedCount + created.length,
    ),
  });
}

async function handlePaste(
  userId: string,
  body: Record<string, unknown>,
  date: string,
) {
  const title = String(body.title || "Pasted role").slice(0, 120);
  const company = String(body.company || "Employer").slice(0, 120);
  const description = String(body.description || body.jd || "").slice(0, 8000);
  const applyUrl = body.applyUrl ? String(body.applyUrl) : undefined;
  const location = String(body.location || "India");
  const requirements = Array.isArray(body.requirements)
    ? body.requirements.map(String)
    : description
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 2 && s.length < 40)
        .slice(0, 8);

  if (!description.trim()) {
    return NextResponse.json({ message: "Paste a job description (description/jd)" }, { status: 400 });
  }

  // Enforce daily seat cap for paste / extract_url
  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { count } = await sb
      .from("application_queue")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("digest_date", date);
    if (remainingQueueSeats(count || 0) <= 0) {
      return NextResponse.json(
        { message: `Daily queue full (${PRODUCT_STANCE.dailyQueueCap} seats)` },
        { status: 429 },
      );
    }
  } else {
    const existing = await localStore.listQueue(userId, date);
    if (remainingQueueSeats(existing.length) <= 0) {
      return NextResponse.json(
        { message: `Daily queue full (${PRODUCT_STANCE.dailyQueueCap} seats)` },
        { status: 429 },
      );
    }
  }

  const jobDraft = {
    id: "draft",
    title,
    company,
    location,
    description,
    requirements,
    source: String(body.source || "user_paste"),
    sourceUrl: applyUrl,
    sourceKind:
      body.sourceKind === "career_page" ? ("career_page" as const) : ("paste" as const),
    roleFamily: inferRoleFamilyFromText(`${title} ${description}`),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: resumeRow } = await sb
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const profileText = profileTextFromResume(
      resumeRow
        ? ({
            id: String(resumeRow.id),
            userId,
            fileName: String(resumeRow.file_name || "resume"),
            fileUrl: "",
            fileSize: 0,
            mimeType: "text/plain",
            rawText: String(resumeRow.raw_text || ""),
            parsedData: (resumeRow.parsed_data as never) || {},
            status: "parsed",
            createdAt: String(resumeRow.created_at || ""),
            updatedAt: String(resumeRow.updated_at || ""),
          } as import("@/lib/db/types").ResumeRecord)
        : null,
    );
    const { data: profileRow } = await sb
      .from("profiles")
      .select("career_targets")
      .eq("id", userId)
      .maybeSingle();
    const targets = normalizeTargets((profileRow?.career_targets as never) || emptyTargets());
    const rubric = evaluateJobMatch(jobDraft, profileText, targets);

    const { data: job, error } = await sb
      .from("jobs")
      .insert({
        title,
        company,
        location,
        description,
        requirements,
        source: "user_paste",
        source_url: applyUrl,
        match_score: rubric.score,
        is_active: true,
      })
      .select("*")
      .single();
    if (error || !job) return NextResponse.json({ message: error?.message || "Failed" }, { status: 500 });

    const { data: row, error: qErr } = await sb
      .from("application_queue")
      .insert({
        user_id: userId,
        job_id: job.id,
        digest_date: date,
        match_score: rubric.score,
        status: "queued",
        apply_url: applyUrl,
        notes: encodeQueueNotes({ rubric, action: rubric.action }),
      })
      .select("*, jobs(*)")
      .single();
    if (qErr || !row) return NextResponse.json({ message: qErr?.message || "Queue failed" }, { status: 500 });
    return NextResponse.json({ item: mapSbQueue(row, row.jobs as Record<string, unknown>) });
  }

  const resumes = await localStore.listResumes(userId);
  const userRow = await localStore.findUserById(userId);
  const targetsLocal = userRow?.careerTargets || null;
  const rubric = evaluateJobMatch(jobDraft, profileTextFromResume(resumes[0]), targetsLocal);

  const job = await localStore.createJob({
    title,
    company,
    location,
    description,
    requirements,
    source: String(body.source || "user_paste"),
    sourceUrl: applyUrl,
    sourceKind: jobDraft.sourceKind,
    roleFamily: jobDraft.roleFamily,
    sourceLabel: body.sourceLabel ? String(body.sourceLabel) : undefined,
    sourcePlatform: body.sourcePlatform ? String(body.sourcePlatform) : undefined,
    sourcePublisher: body.sourcePublisher ? String(body.sourcePublisher) : undefined,
    sourceOfficial: body.sourceOfficial === true,
    discoveredAt: body.discoveredAt ? String(body.discoveredAt) : undefined,
    postedAt: body.postedAt ? String(body.postedAt) : undefined,
    salary: body.salary ? String(body.salary) : undefined,
    salaryLpaMin:
      typeof body.salaryLpaMin === "number" ? body.salaryLpaMin : undefined,
    salaryLpaMax:
      typeof body.salaryLpaMax === "number" ? body.salaryLpaMax : undefined,
    noticeDays: typeof body.noticeDays === "number" ? body.noticeDays : undefined,
    matchScore: rubric.score,
    isActive: true,
  });
  const item = await localStore.createQueueItem({
    userId,
    jobId: job.id,
    digestDate: date,
    matchScore: rubric.score,
    status: "queued",
    applyUrl,
    matchRubric: rubric,
    notes: encodeQueueNotes({ rubric, action: rubric.action }),
  });
  await localStore.bumpValueStats(userId, { pastedQueued: 1 });
  return NextResponse.json({ item });
}

async function prepareItemSupabase(
  userId: string,
  item: ApplicationQueueItem,
  resumeRow: Record<string, unknown>,
): Promise<ApplicationQueueItem | null> {
  const sb = getServiceSupabase()!;
  const job = item.job;
  if (!job) return item;
  const tailored = await tailorResumeForJob(String(resumeRow.raw_text || ""), {
    title: job.title,
    company: job.company,
    description: job.description,
    requirements: job.requirements,
  });
  const { data: version } = await sb
    .from("resume_versions")
    .insert({
      resume_id: resumeRow.id,
      user_id: userId,
      name: `Queue packet — ${job.company}`,
      kind: "job_tailored",
      content_markdown: tailored.markdown,
      target_job_id: job.id,
      optimization_notes: tailored.notes,
      ai_score: tailored.aiScore ?? item.matchScore,
    })
    .select("*")
    .single();

  const notes = mergeQueueNotes(item.notes, {
    rubric: item.matchRubric,
    tailorNotes: tailored.notes,
    action: item.matchRubric?.action,
  });

  const { data: updated } = await sb
    .from("application_queue")
    .update({
      status: "prepared",
      tailored_markdown: tailored.markdown,
      cover_letter: tailored.coverLetter,
      resume_version_id: version?.id,
      notes,
      prepared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .select("*, jobs(*)")
    .single();

  return updated ? mapSbQueue(updated, updated.jobs as Record<string, unknown>) : item;
}
