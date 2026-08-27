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
    const { data, error } = await sb.from("resumes").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error || !data) return NextResponse.json({ message: "Not found" }, { status: 404 });
    const pd = (data.parsed_data || {}) as Record<string, unknown>;
    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      rawText: data.raw_text,
      aiScore: data.ai_score,
      parsedData: data.parsed_data,
      suggestions: data.suggestions,
      atsScorecard: pd.atsScorecard,
      keywordGap: pd.keywordGap,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  const row = await localStore.getResume(id);
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PUT(req: Request, ctx: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: existing } = await sb
      .from("resumes")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.parsedData !== undefined) patch.parsed_data = body.parsedData;
    if (body.rawText !== undefined) patch.raw_text = body.rawText;
    if (body.fileName !== undefined) patch.file_name = body.fileName;
    if (body.aiScore !== undefined) patch.ai_score = body.aiScore;
    if (body.suggestions !== undefined) patch.suggestions = body.suggestions;
    if (body.status !== undefined) patch.status = body.status;

    const { data, error } = await sb.from("resumes").update(patch).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      rawText: data.raw_text,
      aiScore: data.ai_score,
      parsedData: data.parsed_data,
      suggestions: data.suggestions,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  const row = await localStore.getResume(id);
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const updated = await localStore.updateResume(id, {
    parsedData: body.parsedData ?? row.parsedData,
    rawText: body.rawText ?? row.rawText,
    fileName: body.fileName ?? row.fileName,
    aiScore: body.aiScore ?? row.aiScore,
    suggestions: body.suggestions ?? row.suggestions,
    atsScorecard: body.atsScorecard ?? row.atsScorecard,
    keywordGap: body.keywordGap ?? row.keywordGap,
    status: body.status ?? row.status,
  });
  return NextResponse.json(updated);
}
