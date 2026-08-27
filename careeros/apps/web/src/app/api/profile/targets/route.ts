import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { emptyTargets, hasUsableTargets, normalizeTargets } from "@/lib/product/targets";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data } = await sb.from("profiles").select("career_targets").eq("id", user.id).maybeSingle();
    const targets = normalizeTargets((data?.career_targets as never) || emptyTargets());
    return NextResponse.json({ targets, ready: hasUsableTargets(targets) });
  }

  const row = await localStore.findUserById(user.id);
  const targets = normalizeTargets(row?.careerTargets);
  return NextResponse.json({ targets, ready: hasUsableTargets(targets) });
}

export async function PUT(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const targets = normalizeTargets(body.targets || body);

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { error } = await sb.from("profiles").upsert({
      id: user.id,
      career_targets: targets,
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ targets, ready: hasUsableTargets(targets) });
  }

  const updated = await localStore.updateUser(user.id, { careerTargets: targets });
  if (!updated) return NextResponse.json({ message: "User not found" }, { status: 404 });
  return NextResponse.json({ targets, ready: hasUsableTargets(targets) });
}
