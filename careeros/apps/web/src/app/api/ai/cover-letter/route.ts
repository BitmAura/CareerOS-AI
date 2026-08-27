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

  // Reuse tailor engine; return cover letter only
  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: resume } = await sb.from("resumes").select("*").eq("id", resumeId).eq("user_id", user.id).maybeSingle();
    const { data: job } = await sb.from("jobs").select("*").eq("id", jobId).maybeSingle();
    if (!resume || !job) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const tailored = await tailorResumeForJob(resume.raw_text || "", {
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements || [],
    });
    return NextResponse.json({ coverLetter: tailored.coverLetter, notes: tailored.notes });
  }

  const resume = await localStore.getResume(resumeId);
  const job = await localStore.getJob(jobId);
  if (!resume || resume.userId !== user.id || !job) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const tailored = await tailorResumeForJob(resume.rawText || "", {
    title: job.title,
    company: job.company,
    description: job.description,
    requirements: job.requirements,
  });
  return NextResponse.json({ coverLetter: tailored.coverLetter, notes: tailored.notes });
}
