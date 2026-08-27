import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = new Set(["opened", "applied", "shortlisted", "interview", "offer", "rejected"]);

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "");
  if (!ALLOWED.has(status)) {
    return NextResponse.json(
      { message: "status must be opened|applied|shortlisted|interview|offer|rejected" },
      { status: 400 },
    );
  }

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: existing } = await sb
      .from("applications")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const { data, error } = await sb
      .from("applications")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(body.notes != null ? { notes: body.notes } : {}),
      })
      .eq("id", id)
      .select("*, jobs(*)")
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({
      id: data.id,
      status: data.status,
      jobId: data.job_id,
      notes: data.notes,
      appliedAt: data.applied_at,
      updatedAt: data.updated_at,
      job: data.jobs
        ? {
            id: data.jobs.id,
            title: data.jobs.title,
            company: data.jobs.company,
            location: data.jobs.location,
          }
        : undefined,
    });
  }

  const row = await localStore.getApplication(id);
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const prev = row.status;
  const updated = await localStore.updateApplication(id, {
    status,
    notes: body.notes ?? row.notes,
  });
  if (status === "interview" && prev !== "interview") {
    await localStore.bumpValueStats(user.id, { interviews: 1 });
  }
  if (status === "applied" && prev !== "applied" && prev !== "opened") {
    await localStore.bumpValueStats(user.id, { confirmedApplies: 1 });
  }
  return NextResponse.json(updated);
}
