import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { profileTextFromResume } from "@/lib/jobs/digest";
import { mergeQueueNotes, parseQueueNotes } from "@/lib/jobs/queue-notes";
import { tailorResumeForJob } from "@/lib/resume/analyze";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import { isBlockedDiscoveryHost } from "@/lib/jobs/live-discover";
import { probeJobUrlLiveness } from "@/lib/jobs/legitimacy";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

async function livenessForApplyUrl(url: string | null | undefined) {
  const applyUrl = String(url || "").trim();
  if (!applyUrl) return { applyUrl: null as string | null, liveness: null as null };
  if (isBlockedDiscoveryHost(applyUrl)) {
    return {
      applyUrl,
      liveness: { live: false, checked: true, blocked: true as const },
    };
  }
  const probe = await probeJobUrlLiveness(applyUrl);
  return { applyUrl, liveness: { ...probe, blocked: false as const } };
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "prepare");

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: row } = await sb
      .from("application_queue")
      .select("*, jobs(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (action === "dismiss") {
      const { data } = await sb
        .from("application_queue")
        .update({ status: "dismissed", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*, jobs(*)")
        .single();
      return NextResponse.json({ item: data });
    }

    if (action === "approve" || action === "open_careers") {
      const jobId = row.job_id;
      const { data: existing } = await sb
        .from("applications")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("job_id", jobId)
        .maybeSingle();
      if (!existing) {
        await sb.from("applications").insert({
          user_id: user.id,
          job_id: jobId,
          cover_letter: row.cover_letter,
          resume_version_id: row.resume_version_id,
          status: "opened",
          notes:
            "Opened employer careers site from Daily Queue — not yet confirmed as submitted.",
        });
      }
      const { data } = await sb
        .from("application_queue")
        .update({
          status: "opened",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*, jobs(*)")
        .single();
      const live = await livenessForApplyUrl(row.apply_url || row.jobs?.source_url);
      return NextResponse.json({
        item: data,
        applyUrl: live.applyUrl,
        liveness: live.liveness,
        honesty:
          "CareerOS opened the employer careers page. Mark 'I submitted' only after you finish their form.",
      });
    }

    if (action === "confirm_submitted") {
      const jobId = row.job_id;
      const { data: existing } = await sb
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("job_id", jobId)
        .maybeSingle();
      if (existing) {
        await sb
          .from("applications")
          .update({
            status: "applied",
            notes: "Candidate confirmed they submitted on the employer site (assisted apply).",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await sb.from("applications").insert({
          user_id: user.id,
          job_id: jobId,
          cover_letter: row.cover_letter,
          resume_version_id: row.resume_version_id,
          status: "applied",
          notes: "Candidate confirmed they submitted on the employer site (assisted apply).",
        });
      }
      await sb
        .from("application_queue")
        .update({
          status: "approved",
          approved_at: row.approved_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      return NextResponse.json({
        ok: true,
        message: "Marked as submitted — tracked in Applications.",
      });
    }

    // prepare — preserve rubric in notes JSON
    const { data: resumes } = await sb
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    const resume = resumes?.[0];
    if (!resume) return NextResponse.json({ message: "Upload a resume first" }, { status: 400 });
    const job = row.jobs;
    const tailored = await tailorResumeForJob(resume.raw_text || "", {
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements || [],
    });
    const { data: version } = await sb
      .from("resume_versions")
      .insert({
        resume_id: resume.id,
        user_id: user.id,
        name: `Queue packet — ${job.company}`,
        kind: "job_tailored",
        content_markdown: tailored.markdown,
        target_job_id: jobIdSafe(row),
        optimization_notes: tailored.notes,
        ai_score: tailored.aiScore,
      })
      .select("*")
      .single();
    const notes = mergeQueueNotes(row.notes ? String(row.notes) : null, {
      tailorNotes: tailored.notes,
    });
    const { data } = await sb
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
      .eq("id", id)
      .select("*, jobs(*)")
      .single();
    return NextResponse.json({ item: data });
  }

  const item = await localStore.getQueueItem(id);
  if (!item || item.userId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (action === "dismiss") {
    return NextResponse.json({ item: await localStore.updateQueueItem(id, { status: "dismissed" }) });
  }

  if (action === "approve" || action === "open_careers") {
    const existing = await localStore.findApplication(user.id, item.jobId);
    if (!existing) {
      await localStore.createApplication({
        userId: user.id,
        jobId: item.jobId,
        coverLetter: item.coverLetter,
        resumeVersionId: item.resumeVersionId,
        status: "opened",
        notes:
          "Opened employer careers site from Daily Queue — not yet confirmed as submitted.",
      });
    }
    const updated = await localStore.updateQueueItem(id, {
      status: "opened",
    });
    const live = await livenessForApplyUrl(item.applyUrl || item.job?.sourceUrl);
    return NextResponse.json({
      item: updated,
      applyUrl: live.applyUrl,
      liveness: live.liveness,
      honesty:
        "CareerOS opened the employer careers page. Mark 'I submitted' only after you finish their form.",
    });
  }

  if (action === "confirm_submitted") {
    const existing = await localStore.findApplication(user.id, item.jobId);
    if (existing) {
      await localStore.updateApplication(existing.id, {
        status: "applied",
        notes: "Candidate confirmed they submitted on the employer site (assisted apply).",
        resumeVersionId: item.resumeVersionId || existing.resumeVersionId,
        coverLetter: item.coverLetter || existing.coverLetter,
      });
    } else {
      await localStore.createApplication({
        userId: user.id,
        jobId: item.jobId,
        coverLetter: item.coverLetter,
        resumeVersionId: item.resumeVersionId,
        status: "applied",
        notes: "Candidate confirmed they submitted on the employer site (assisted apply).",
      });
    }
    await localStore.bumpValueStats(user.id, { confirmedApplies: 1 });
    const updated = await localStore.updateQueueItem(id, {
      status: "approved",
      approvedAt: item.approvedAt || new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true,
      item: updated,
      message: "Marked as submitted — tracked in Applications.",
    });
  }

  const resumes = await localStore.listResumes(user.id);
  const resume = resumes[0];
  if (!resume || !item.job) {
    return NextResponse.json({ message: "Need a resume and job" }, { status: 400 });
  }
  const tailored = await tailorResumeForJob(resume.rawText || profileTextFromResume(resume), {
    title: item.job.title,
    company: item.job.company,
    description: item.job.description,
    requirements: item.job.requirements,
  });
  const version = await localStore.createVersion({
    resumeId: resume.id,
    userId: user.id,
    name: `Queue packet — ${item.job.company}`,
    kind: "job_tailored",
    contentMarkdown: tailored.markdown,
    targetJobId: item.jobId,
    optimizationNotes: tailored.notes,
    aiScore: tailored.aiScore,
  });
  const rubric = item.matchRubric || parseQueueNotes(item.notes).rubric;
  const updated = await localStore.updateQueueItem(id, {
    status: "prepared",
    tailoredMarkdown: tailored.markdown,
    coverLetter: tailored.coverLetter,
    resumeVersionId: version.id,
    preparedAt: new Date().toISOString(),
    matchRubric: rubric,
    notes: mergeQueueNotes(item.notes, {
      rubric,
      tailorNotes: tailored.notes,
      action: rubric?.action,
    }),
  });
  await localStore.bumpValueStats(user.id, { packetsPrepared: 1 });
  return NextResponse.json({ item: updated });
}

function jobIdSafe(row: { job_id?: string }) {
  return row.job_id;
}
