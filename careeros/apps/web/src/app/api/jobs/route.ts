import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { matchContextText } from "@/lib/jobs/digest";
import { evaluateJobMatch } from "@/lib/jobs/match-rubric";
import { emptyTargets, normalizeTargets } from "@/lib/product/targets";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { CareerTargets, JobRecord, ResumeRecord } from "@/lib/db/types";

async function loadMatchContext(userId: string): Promise<{
  profileText: string;
  targets: CareerTargets;
}> {
  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const [{ data: resumes }, { data: profile }] = await Promise.all([
      sb
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1),
      sb.from("profiles").select("career_targets").eq("id", userId).maybeSingle(),
    ]);
    const resumeRow = resumes?.[0];
    const resume = resumeRow
      ? ({
          id: resumeRow.id,
          userId,
          fileName: resumeRow.file_name || "resume",
          fileUrl: "",
          fileSize: 0,
          mimeType: "text/plain",
          rawText: resumeRow.raw_text || "",
          parsedData: resumeRow.parsed_data || undefined,
          status: "parsed",
          createdAt: resumeRow.created_at,
          updatedAt: resumeRow.updated_at,
        } satisfies ResumeRecord)
      : null;
    const targets = normalizeTargets(
      (profile?.career_targets as CareerTargets | null) || emptyTargets(),
    );
    return { profileText: matchContextText(resume, targets), targets };
  }

  const resumes = await localStore.listResumes(userId);
  const user = await localStore.findUserById(userId);
  const targets = normalizeTargets(user?.careerTargets);
  return { profileText: matchContextText(resumes[0], targets), targets };
}

function mapJobWithLiveMatch(
  job: JobRecord,
  profileText: string,
  targets: CareerTargets,
) {
  const rubric = profileText
    ? evaluateJobMatch(job, profileText, targets)
    : null;
  return {
    ...job,
    matchScore: rubric?.score ?? job.matchScore ?? null,
    matchGrade: rubric?.grade ?? null,
    matchWhy: rubric?.why?.slice(0, 2) ?? [],
    matchGaps: rubric?.gaps?.slice(0, 3) ?? [],
    matchUnknowns: rubric?.unknowns ?? [],
    matchLive: Boolean(rubric),
    sourceUrl: job.sourceUrl || null,
  };
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { profileText, targets } = await loadMatchContext(user.id);

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .not("source_url", "is", null);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    const jobs = (data || [])
      .filter((j) => Boolean(j.source_url))
      .map((j) =>
      mapJobWithLiveMatch(
        {
          id: j.id,
          title: j.title,
          company: j.company,
          location: j.location,
          salary: j.salary,
          description: j.description,
          requirements: j.requirements || [],
          source: j.source,
          sourceUrl: j.source_url,
          sourceKind: /manual|beachhead/i.test(String(j.source || ""))
            ? "beachhead"
            : "live",
          matchScore: j.match_score,
          isActive: j.is_active,
          createdAt: j.created_at,
          updatedAt: j.updated_at,
        },
        profileText,
        targets,
      ),
    );
    jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    return NextResponse.json(jobs);
  }

  const jobs = (await localStore.listJobs())
    .filter((j) => Boolean(j.sourceUrl) && j.sourceKind !== "beachhead")
    .map((j) => mapJobWithLiveMatch(j, profileText, targets));
  jobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  return NextResponse.json(jobs);
}
