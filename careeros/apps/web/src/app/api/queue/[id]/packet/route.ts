import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { buildPacketHtml, buildSimpleTextPdf } from "@/lib/resume/packet-pdf";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

async function loadPacketSource(userId: string, id: string) {
  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const { data: row } = await sb
      .from("application_queue")
      .select("*, jobs(*)")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return null;
    return {
      tailoredMarkdown: row.tailored_markdown ? String(row.tailored_markdown) : undefined,
      coverLetter: row.cover_letter ? String(row.cover_letter) : undefined,
      title: row.jobs?.title ? String(row.jobs.title) : "CareerOS packet",
      company: row.jobs?.company ? String(row.jobs.company) : "Employer",
    };
  }

  const item = await localStore.getQueueItem(id);
  if (!item || item.userId !== userId) return null;
  return {
    tailoredMarkdown: item.tailoredMarkdown,
    coverLetter: item.coverLetter,
    title: item.job?.title || "CareerOS packet",
    company: item.job?.company || "Employer",
  };
}

export async function GET(req: Request, ctx: Ctx) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") || "html").toLowerCase();

  const source = await loadPacketSource(user.id, id);
  if (!source) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const resumeMd =
    source.tailoredMarkdown ||
    `# ${source.title}\n\nPrepare this seat first to generate an ATS packet.`;

  if (format === "pdf") {
    const bytes = buildSimpleTextPdf(
      `${source.title} — ${source.company}\n\n${resumeMd}\n\n${source.coverLetter || ""}`,
      `${source.title} @ ${source.company}`,
    );
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="careeros-packet-${id.slice(0, 8)}.pdf"`,
      },
    });
  }

  const html = buildPacketHtml({
    title: source.title,
    company: source.company,
    resumeMarkdown: resumeMd,
    coverLetter: source.coverLetter,
    brandName: PRODUCT_STANCE.brandName,
  });
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="careeros-packet-${id.slice(0, 8)}.html"`,
    },
  });
}
