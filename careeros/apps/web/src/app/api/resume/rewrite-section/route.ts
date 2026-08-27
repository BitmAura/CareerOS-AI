import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { rewriteResumeSection } from "@/lib/resume/analyze";

export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const section = body.section as "summary" | "bullet" | "skills";
  const content = String(body.content || "");
  const context = typeof body.context === "string" ? body.context : undefined;
  if (!["summary", "bullet", "skills"].includes(section)) {
    return NextResponse.json({ message: "section must be summary|bullet|skills" }, { status: 400 });
  }
  const rewritten = await rewriteResumeSection(section, content, context);
  return NextResponse.json({ text: rewritten });
}
