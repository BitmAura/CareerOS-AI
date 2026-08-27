import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { remainingQueueSeats, todayDigestDate } from "@/lib/jobs/digest";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { hasUsableTargets, normalizeTargets } from "@/lib/product/targets";
import { buildHuntToday } from "@/lib/product/hunt-loop";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const date = todayDigestDate();

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const [{ data: profile }, { data: resumes }, { data: queue }, { data: runs }, { data: apps }] =
      await Promise.all([
        sb.from("profiles").select("career_targets").eq("id", user.id).maybeSingle(),
        sb.from("resumes").select("id").eq("user_id", user.id),
        sb
          .from("application_queue")
          .select("status")
          .eq("user_id", user.id)
          .eq("digest_date", date),
        sb.from("digest_runs").select("id").eq("user_id", user.id).eq("digest_date", date),
        sb
          .from("applications")
          .select("id, status, notes, applied_at, updated_at, jobs(company, title)")
          .eq("user_id", user.id),
      ]);

    const pending = (queue || []).filter((q) =>
      ["queued", "prepared", "opened"].includes(String(q.status)),
    ).length;

    return NextResponse.json(
      buildHuntToday({
        targetsReady: hasUsableTargets(normalizeTargets(profile?.career_targets as never)),
        resumeCount: resumes?.length || 0,
        queuePending: pending,
        seatsRemaining: remainingQueueSeats(queue?.length || 0),
        runsRemaining: Math.max(0, PRODUCT_STANCE.dailyDigestRunsMax - (runs?.length || 0)),
        applications: (apps || []).map((a) => {
          const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
          return {
            id: String(a.id),
            status: String(a.status || ""),
            appliedAt: a.applied_at ? String(a.applied_at) : undefined,
            updatedAt: a.updated_at ? String(a.updated_at) : undefined,
            notes: a.notes ? String(a.notes) : undefined,
            job: job
              ? { company: String(job.company || ""), title: String(job.title || "") }
              : undefined,
          };
        }),
      }),
    );
  }

  const dbUser = await localStore.findUserById(user.id);
  const resumes = await localStore.listResumes(user.id);
  const queue = await localStore.listQueue(user.id, date);
  const runs = await localStore.listDigestRuns(user.id, date);
  const apps = await localStore.listApplications(user.id);
  const pending = queue.filter(
    (q) => q.status === "queued" || q.status === "prepared" || q.status === "opened",
  ).length;

  return NextResponse.json(
    buildHuntToday({
      targetsReady: hasUsableTargets(dbUser?.careerTargets),
      resumeCount: resumes.length,
      queuePending: pending,
      seatsRemaining: remainingQueueSeats(queue.length),
      runsRemaining: Math.max(0, PRODUCT_STANCE.dailyDigestRunsMax - runs.length),
      applications: apps.map((a) => ({
        id: a.id,
        status: a.status,
        appliedAt: a.appliedAt,
        updatedAt: a.updatedAt,
        notes: a.notes,
        job: a.job ? { company: a.job.company, title: a.job.title } : undefined,
      })),
    }),
  );
}
