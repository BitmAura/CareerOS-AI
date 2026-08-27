import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { extractResumeText } from "@/lib/resume/extract";
import { analyzeResumeText } from "@/lib/resume/analyze";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File is required" }, { status: 400 });
  }

  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (!allowed.includes(file.type) && !/\.(pdf|docx?|txt)$/i.test(file.name)) {
    return NextResponse.json({ message: "Only PDF, Word, or TXT allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  let rawText = "";
  try {
    rawText = await extractResumeText(buffer, file.type || "application/octet-stream", file.name);
  } catch {
    rawText = "";
  }

  // Analyze inline (may use Gemini). Keep under timeout when possible.
  const analysis = await analyzeResumeText(rawText);
  const nowStatus = rawText.length < 40 ? "failed" : "parsed";

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const path = `${user.id}/${id}-${file.name}`;
    const { error: upErr } = await sb.storage.from("resumes").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (upErr) {
      return NextResponse.json({ message: upErr.message }, { status: 500 });
    }

    const { data, error } = await sb
      .from("resumes")
      .insert({
        id,
        user_id: user.id,
        file_name: file.name,
        file_url: path,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        raw_text: rawText,
        ai_score: analysis.aiScore,
        parsed_data: {
          ...(analysis.parsedData || {}),
          atsScorecard: analysis.atsScorecard,
          keywordGap: analysis.keywordGap,
        },
        suggestions: analysis.suggestions,
        status: nowStatus,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    return NextResponse.json({
      id: data.id,
      userId: data.user_id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      aiScore: data.ai_score,
      parsedData: data.parsed_data,
      suggestions: data.suggestions,
      atsScorecard: analysis.atsScorecard,
      keywordGap: analysis.keywordGap,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      rawTextPreview: rawText.slice(0, 500),
    });
  }

  await localStore.saveFile(id, buffer.toString("base64"));
  const row = await localStore.createResume({
    id,
    userId: user.id,
    fileName: file.name,
    fileUrl: `/api/resume/${id}/file`,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
    rawText,
    aiScore: analysis.aiScore,
    parsedData: analysis.parsedData,
    suggestions: analysis.suggestions,
    atsScorecard: analysis.atsScorecard,
    keywordGap: analysis.keywordGap,
    status: nowStatus,
  });

  return NextResponse.json({ ...row, rawTextPreview: rawText.slice(0, 500) });
}
