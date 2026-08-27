import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { tailorResumeForJob } from "@/lib/resume/analyze";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const resumeId = String(body.resumeId || "");
  const jobId = String(body.jobId || "");
  if (!resumeId || !jobId) {
    return NextResponse.json({ message: "resumeId and jobId required" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: resume } = await sb
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: job } = await sb.from("jobs").select("*").eq("id", jobId).maybeSingle();
    if (!resume || !job) return NextResponse.json({ message: "Resume or job not found" }, { status: 404 });

    const tailored = await tailorResumeForJob(resume.raw_text || "", {
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements || [],
    });

    const { data: version, error } = await sb
      .from("resume_versions")
      .insert({
        resume_id: resumeId,
        user_id: user.id,
        name: `Tailored — ${job.company} ${job.title}`,
        kind: "job_tailored",
        content_markdown: tailored.markdown,
        optimization_notes: tailored.notes,
        target_job_id: jobId,
        ai_score: Math.min(99, (resume.ai_score || 65) + 10),
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    await sb.from("resume_versions").insert({
      resume_id: resumeId,
      user_id: user.id,
      name: `Cover letter — ${job.company}`,
      kind: "cover_letter",
      content_markdown: tailored.coverLetter,
      target_job_id: jobId,
      optimization_notes: tailored.notes,
    });

    return NextResponse.json({
      version: {
        id: version.id,
        name: version.name,
        contentMarkdown: version.content_markdown,
        kind: version.kind,
        aiScore: version.ai_score,
      },
      coverLetter: tailored.coverLetter,
      notes: tailored.notes,
    });
  }

  const resume = await localStore.getResume(resumeId);
  const job = await localStore.getJob(jobId);
  if (!resume || resume.userId !== user.id || !job) {
    return NextResponse.json({ message: "Resume or job not found" }, { status: 404 });
  }

  const tailored = await tailorResumeForJob(resume.rawText || "", {
    title: job.title,
    company: job.company,
    description: job.description,
    requirements: job.requirements,
  });

  const version = await localStore.createVersion({
    resumeId,
    userId: user.id,
    name: `Tailored — ${job.company} ${job.title}`,
    kind: "job_tailored",
    contentMarkdown: tailored.markdown,
    optimizationNotes: tailored.notes,
    targetJobId: jobId,
    aiScore: Math.min(99, (resume.aiScore || 65) + 10),
  });

  await localStore.createVersion({
    resumeId,
    userId: user.id,
    name: `Cover letter — ${job.company}`,
    kind: "cover_letter",
    contentMarkdown: tailored.coverLetter,
    targetJobId: jobId,
    optimizationNotes: tailored.notes,
  });

  return NextResponse.json({ version, coverLetter: tailored.coverLetter, notes: tailored.notes });
}
