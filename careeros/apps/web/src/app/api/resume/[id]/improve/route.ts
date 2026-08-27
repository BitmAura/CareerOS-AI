import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { analyzeResumeText, improveResumeMarkdown } from "@/lib/resume/analyze";
import { normalizeExtractedText } from "@/lib/resume/extract";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: resume, error } = await sb
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !resume) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const rawText = normalizeExtractedText(resume.raw_text || "");
    const analysis = await analyzeResumeText(rawText);
    const markdown = await improveResumeMarkdown(rawText, analysis);

    // Persist cleaned text + refreshed analysis so scorecard stays honest
    await sb
      .from("resumes")
      .update({
        raw_text: rawText,
        parsed_data: { ...analysis.parsedData, atsScorecard: analysis.atsScorecard, keywordGap: analysis.keywordGap },
        suggestions: analysis.suggestions,
        ai_score: analysis.aiScore,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    const { data: version, error: vErr } = await sb
      .from("resume_versions")
      .insert({
        resume_id: id,
        user_id: user.id,
        name: `ATS improved — ${new Date().toLocaleDateString("en-IN")}`,
        kind: "improved",
        content_markdown: markdown,
        ai_score: Math.min(99, (analysis.aiScore || 60) + 5),
        optimization_notes: (analysis.suggestions || [])
          .map((s: { title: string }) => s.title)
          .join("; "),
      })
      .select("*")
      .single();
    if (vErr) return NextResponse.json({ message: vErr.message }, { status: 500 });

    return NextResponse.json({
      id: version.id,
      resumeId: version.resume_id,
      name: version.name,
      kind: version.kind,
      contentMarkdown: version.content_markdown,
      aiScore: version.ai_score,
      optimizationNotes: version.optimization_notes,
      createdAt: version.created_at,
    });
  }

  const resume = await localStore.getResume(id);
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const rawText = normalizeExtractedText(resume.rawText || "");
  const analysis = await analyzeResumeText(rawText);
  const markdown = await improveResumeMarkdown(rawText, analysis);

  await localStore.updateResume(id, {
    rawText,
    parsedData: {
      ...analysis.parsedData,
      // keep scorecard accessible via resume fields when API maps them
    },
    suggestions: analysis.suggestions,
    aiScore: analysis.aiScore,
    atsScorecard: analysis.atsScorecard,
    keywordGap: analysis.keywordGap,
    status: "parsed",
  });

  const version = await localStore.createVersion({
    resumeId: id,
    userId: user.id,
    name: `ATS improved — ${new Date().toLocaleDateString("en-IN")}`,
    kind: "improved",
    contentMarkdown: markdown,
    aiScore: Math.min(99, (analysis.aiScore || 60) + 5),
    optimizationNotes: analysis.suggestions.map((s) => s.title).join("; "),
  });

  return NextResponse.json(version);
}
