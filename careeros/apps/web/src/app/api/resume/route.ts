import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(
      (data || []).map((r) => {
        const pd = (r.parsed_data || {}) as Record<string, unknown>;
        return {
          id: r.id,
          userId: r.user_id,
          fileName: r.file_name,
          fileUrl: r.file_url,
          fileSize: r.file_size,
          mimeType: r.mime_type,
          aiScore: r.ai_score,
          parsedData: r.parsed_data,
          suggestions: r.suggestions,
          atsScorecard: pd.atsScorecard,
          keywordGap: pd.keywordGap,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }),
    );
  }

  return NextResponse.json(await localStore.listResumes(user.id));
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const template = String(body.template || "ats_classic");
  const name = String(body.name || "Untitled resume");
  const id = randomUUID();

  const blankParsed = {
    contact: { name: user.name || "", email: user.email || "", phone: "", location: "" },
    summary: "",
    skills: [] as string[],
    experience: [] as Array<{ role: string; company: string; startDate: string; endDate: string; bullets: string[] }>,
    education: [] as Array<{ degree: string; institution: string; year: string }>,
    gaps: [],
    template,
  };

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb
      .from("resumes")
      .insert({
        id,
        user_id: user.id,
        file_name: `${name}.md`,
        file_url: `builder/${id}`,
        file_size: 0,
        mime_type: "text/markdown",
        raw_text: "",
        ai_score: null,
        parsed_data: blankParsed,
        suggestions: [],
        status: "parsed",
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
      parsedData: data.parsed_data,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }

  const row = await localStore.createResume({
    id,
    userId: user.id,
    fileName: `${name}.md`,
    fileUrl: `/resume/builder?id=${id}`,
    fileSize: 0,
    mimeType: "text/markdown",
    rawText: "",
    parsedData: blankParsed,
    suggestions: [],
    status: "parsed",
  });
  return NextResponse.json(row);
}
