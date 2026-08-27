import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb
      .from("resume_versions")
      .select("*")
      .eq("resume_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(
      (data || []).map((v) => ({
        id: v.id,
        resumeId: v.resume_id,
        userId: v.user_id,
        name: v.name,
        kind: v.kind,
        contentMarkdown: v.content_markdown,
        aiScore: v.ai_score,
        optimizationNotes: v.optimization_notes,
        targetJobId: v.target_job_id,
        createdAt: v.created_at,
      })),
    );
  }

  const resume = await localStore.getResume(id);
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(await localStore.listVersions(id));
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const name = String(body.name || "Draft");
  const kind = (body.kind || "draft") as "improved" | "job_tailored" | "cover_letter" | "draft";
  const contentMarkdown = String(body.contentMarkdown || "");
  if (!contentMarkdown.trim()) {
    return NextResponse.json({ message: "contentMarkdown required" }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: resume } = await sb
      .from("resumes")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!resume) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const { data, error } = await sb
      .from("resume_versions")
      .insert({
        resume_id: id,
        user_id: user.id,
        name,
        kind,
        content_markdown: contentMarkdown,
        ai_score: body.aiScore ?? null,
        optimization_notes: body.optimizationNotes ?? null,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({
      id: data.id,
      resumeId: data.resume_id,
      userId: data.user_id,
      name: data.name,
      kind: data.kind,
      contentMarkdown: data.content_markdown,
      aiScore: data.ai_score,
      createdAt: data.created_at,
    });
  }

  const resume = await localStore.getResume(id);
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const version = await localStore.createVersion({
    resumeId: id,
    userId: user.id,
    name,
    kind,
    contentMarkdown,
    aiScore: body.aiScore,
    optimizationNotes: body.optimizationNotes,
  });
  return NextResponse.json(version);
}

