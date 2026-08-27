import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { generateResumeFromOutline } from "@/lib/resume/analyze";
import { parsedDataToMarkdown } from "@/lib/resume/to-markdown";
import { localStore } from "@/lib/db/local-store";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const outline = {
    name: String(body.name || user.name || "Professional"),
    years: body.years ? String(body.years) : undefined,
    targetRole: body.targetRole ? String(body.targetRole) : undefined,
    skills: Array.isArray(body.skills) ? body.skills.map(String) : undefined,
    roles: Array.isArray(body.roles) ? body.roles : undefined,
  };
  const resumeId = body.resumeId ? String(body.resumeId) : "";

  const parsedData = await generateResumeFromOutline(outline);
  const markdown = parsedDataToMarkdown(parsedData);

  if (resumeId) {
    if (isSupabaseConfigured()) {
      const sb = getServiceSupabase()!;
      const { data: existing } = await sb
        .from("resumes")
        .select("id")
        .eq("id", resumeId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) return NextResponse.json({ message: "Resume not found" }, { status: 404 });
      await sb
        .from("resumes")
        .update({
          parsed_data: parsedData,
          raw_text: markdown,
          file_name: `${outline.name.replace(/\s+/g, "-")}-draft.md`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resumeId);
      await sb.from("resume_versions").insert({
        resume_id: resumeId,
        user_id: user.id,
        name: "Generated from outline",
        kind: "improved",
        content_markdown: markdown,
      });
    } else {
      const resume = await localStore.getResume(resumeId);
      if (!resume || resume.userId !== user.id) {
        return NextResponse.json({ message: "Resume not found" }, { status: 404 });
      }
      await localStore.updateResume(resumeId, {
        parsedData,
        rawText: markdown,
        fileName: `${outline.name.replace(/\s+/g, "-")}-draft.md`,
      });
      await localStore.createVersion({
        resumeId,
        userId: user.id,
        name: "Generated from outline",
        kind: "improved",
        contentMarkdown: markdown,
      });
    }
  }

  return NextResponse.json({ parsedData, markdown });
}
