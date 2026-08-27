import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb
      .from("applications")
      .select("*, jobs(*)")
      .eq("user_id", user.id)
      .order("applied_at", { ascending: false });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(
      (data || []).map((a) => ({
        id: a.id,
        userId: a.user_id,
        jobId: a.job_id,
        status: a.status,
        coverLetter: a.cover_letter,
        notes: a.notes,
        resumeVersionId: a.resume_version_id,
        appliedAt: a.applied_at,
        updatedAt: a.updated_at,
        job: a.jobs
          ? {
              id: a.jobs.id,
              title: a.jobs.title,
              company: a.jobs.company,
              location: a.jobs.location,
              salary: a.jobs.salary,
              sourceUrl: a.jobs.source_url || null,
            }
          : undefined,
      })),
    );
  }

  const rows = await localStore.listApplications(user.id);
  return NextResponse.json(
    rows.map((a) => ({
      ...a,
      job: a.job
        ? {
            id: a.job.id,
            title: a.job.title,
            company: a.job.company,
            location: a.job.location,
            salary: a.job.salary,
            sourceUrl: a.job.sourceUrl || null,
          }
        : undefined,
    })),
  );
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const jobId = String(body.jobId || "");
  if (!jobId) return NextResponse.json({ message: "jobId required" }, { status: 400 });

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: jobFull } = await sb.from("jobs").select("*").eq("id", jobId).maybeSingle();
    if (!jobFull) return NextResponse.json({ message: "Job not found" }, { status: 404 });

    const { data: existing } = await sb
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .maybeSingle();
    if (existing) return NextResponse.json({ message: "Already applied to this job" }, { status: 409 });

    const { data, error } = await sb
      .from("applications")
      .insert({
        user_id: user.id,
        job_id: jobId,
        cover_letter: body.coverLetter,
        status: "opened",
        notes: body.notes || "Opened careers from Jobs — not yet confirmed submitted",
      })
      .select("*, jobs(*)")
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({
      id: data.id,
      status: data.status,
      jobId: data.job_id,
      appliedAt: data.applied_at,
      job: data.jobs,
      applyUrl: jobFull.source_url || null,
      honesty: "Opened employer site only — mark Applied after you submit their form.",
    });
  }

  const job = await localStore.getJob(jobId);
  if (!job) return NextResponse.json({ message: "Job not found" }, { status: 404 });
  const existing = await localStore.findApplication(user.id, jobId);
  if (existing) return NextResponse.json({ message: "Already applied to this job" }, { status: 409 });

  const app = await localStore.createApplication({
    userId: user.id,
    jobId,
    coverLetter: body.coverLetter,
    status: "opened",
    notes: body.notes || "Opened careers from Jobs — not yet confirmed submitted",
  });
  return NextResponse.json({
    ...app,
    applyUrl: job.sourceUrl || null,
    honesty: "Opened employer site only — mark Applied after you submit their form.",
  });
}
