import type { ParsedResume } from "@/lib/db/types";

export type MarkdownExportMode = "ats" | "print";

/**
 * Convert parsed resume data to Markdown.
 *
 * @param data        - Parsed resume data
 * @param mode        - "ats" (default) strips photo for ATS-safe export.
 *                      "print" includes photo comment for visual preview / PDF print.
 */
export function parsedDataToMarkdown(data: ParsedResume, mode: MarkdownExportMode = "ats"): string {
  const c = data.contact || {};
  const lines: string[] = [];
  lines.push(`# ${c.name || "Professional"}`);

  // G6 Fix: In ATS mode, omit photo completely. In print mode, include the photo hint.
  const contactParts = [c.email, c.phone, c.location, c.linkedin].filter(Boolean);
  if (mode === "print" && c.photoUrl) {
    // Photo is shown in print/preview but NOT included in contact line (ATS rejects photo in text)
    lines.push(contactParts.join(" | "));
    lines.push("");
    lines.push("<!-- photo: CareerOS preview / print only — omit when submitting to ATS -->");
  } else {
    if (contactParts.length) lines.push(contactParts.join(" | "));
  }
  lines.push("");
  if (data.summary) {
    lines.push("## Professional Summary");
    lines.push(data.summary);
    lines.push("");
  }
  if (data.skills?.length) {
    lines.push("## Skills");
    lines.push(data.skills.join(" · "));
    lines.push("");
  }
  if (data.experience?.length) {
    lines.push("## Experience");
    for (const e of data.experience) {
      lines.push(`### ${e.role || "Role"} — ${e.company || "Company"}`);
      lines.push(`${e.startDate || ""} – ${e.endDate || "Present"}`);
      for (const b of e.bullets || []) lines.push(`- ${b}`);
      lines.push("");
    }
  }
  if (data.education?.length) {
    lines.push("## Education");
    for (const ed of data.education) {
      lines.push(`- ${ed.degree || ""} — ${ed.institution || ""} (${ed.year || ""})`);
    }
  }
  return lines.join("\n").trim();
}

/** Compress image file to a small JPEG data URL for local/Supabase JSON storage. */
export async function fileToResumePhotoDataUrl(file: File, maxPx = 360): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a JPG or PNG photo");
  }
  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Photo must be under 4MB");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process photo");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (dataUrl.length > 350_000) {
    throw new Error("Photo still too large after compress — try a simpler headshot");
  }
  return dataUrl;
}
