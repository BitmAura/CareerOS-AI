import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { generateWinKit } from "@/lib/career/win-kit";
import { localStore } from "@/lib/db/local-store";
import { emptyTargets, normalizeTargets } from "@/lib/product/targets";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode || "apply_assist") as
    | "apply_assist"
    | "outreach"
    | "interview_stories"
    | "negotiate";
  const queueId = body.queueId ? String(body.queueId) : "";
  const jobId = body.jobId ? String(body.jobId) : "";

  let jobTitle = String(body.jobTitle || "");
  let company = String(body.company || "");
  let jobDescription = String(body.jobDescription || "");
  let resumeText = String(body.resumeText || "");
  let targets = emptyTargets();

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: profile } = await sb
      .from("profiles")
      .select("career_targets")
      .eq("id", user.id)
      .maybeSingle();
    targets = normalizeTargets(profile?.career_targets || {});
    if (!resumeText) {
      const { data: resumeRow } = await sb
        .from("resumes")
        .select("raw_text")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (resumeRow?.raw_text) resumeText = String(resumeRow.raw_text);
    }
    if (queueId) {
      const { data: row } = await sb
        .from("application_queue")
        .select("*, jobs(*)")
        .eq("id", queueId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!row) return NextResponse.json({ message: "Queue item not found" }, { status: 404 });
      jobTitle = jobTitle || String(row.jobs?.title || "");
      company = company || String(row.jobs?.company || "");
      jobDescription = jobDescription || String(row.jobs?.description || "");
      if (row.tailored_markdown) resumeText = resumeText || String(row.tailored_markdown);
    }
  } else {
    const dbUser = await localStore.findUserById(user.id);
    targets = dbUser?.careerTargets || emptyTargets();
    const resumes = await localStore.listResumes(user.id);
    if (!resumeText && resumes[0]?.rawText) resumeText = resumes[0].rawText;

    if (queueId) {
      const item = await localStore.getQueueItem(queueId);
      if (!item || item.userId !== user.id) {
        return NextResponse.json({ message: "Queue item not found" }, { status: 404 });
      }
      jobTitle = jobTitle || item.job?.title || "";
      company = company || item.job?.company || "";
      jobDescription = jobDescription || item.job?.description || "";
      if (item.tailoredMarkdown) resumeText = resumeText || item.tailoredMarkdown;
    } else if (jobId) {
      const job = await localStore.getJob(jobId);
      if (job) {
        jobTitle = jobTitle || job.title;
        company = company || job.company;
        jobDescription = jobDescription || job.description;
      }
    }
  }

  if (!jobTitle && mode !== "negotiate" && mode !== "interview_stories") {
    return NextResponse.json({ message: "jobTitle or queueId required" }, { status: 400 });
  }

  const kit = await generateWinKit({
    mode,
    jobTitle: jobTitle || "Target role",
    company: company || "Employer",
    jobDescription,
    resumeText: resumeText || "No resume on file yet.",
    targets,
    contactName: body.contactName ? String(body.contactName) : undefined,
  });

  return NextResponse.json({
    mode,
    ...kit,
    honesty: "Drafts only — CareerOS never sends LinkedIn messages or submits applications.",
  });
}
