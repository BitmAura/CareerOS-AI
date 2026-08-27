import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { analyzeResumeText } from "@/lib/resume/analyze";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const pastedText = typeof body.text === "string" ? body.text.trim() : "";
  const targetJd = typeof body.targetJd === "string" ? body.targetJd.trim() : "";

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: resume, error } = await sb
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !resume) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const rawText = pastedText || resume.raw_text || "";
    const analysis = await analyzeResumeText(rawText, { targetJd: targetJd || undefined });
    const { data, error: upErr } = await sb
      .from("resumes")
      .update({
        raw_text: rawText,
        ai_score: analysis.aiScore,
        parsed_data: {
          ...(analysis.parsedData || {}),
          atsScorecard: analysis.atsScorecard,
          keywordGap: analysis.keywordGap,
        },
        suggestions: analysis.suggestions,
        status: rawText.length < 40 ? "failed" : "parsed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (upErr) return NextResponse.json({ message: upErr.message }, { status: 500 });
    return NextResponse.json({
      id: data.id,
      aiScore: data.ai_score,
      parsedData: data.parsed_data,
      suggestions: data.suggestions,
      atsScorecard: analysis.atsScorecard,
      keywordGap: analysis.keywordGap,
      status: data.status,
    });
  }

  const resume = await localStore.getResume(id);
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const rawText = pastedText || resume.rawText || "";
  const analysis = await analyzeResumeText(rawText, { targetJd: targetJd || undefined });
  const updated = await localStore.updateResume(id, {
    rawText,
    aiScore: analysis.aiScore,
    parsedData: analysis.parsedData,
    suggestions: analysis.suggestions,
    atsScorecard: analysis.atsScorecard,
    keywordGap: analysis.keywordGap,
    status: rawText.length < 40 ? "failed" : "parsed",
  });
  return NextResponse.json(updated);
}
