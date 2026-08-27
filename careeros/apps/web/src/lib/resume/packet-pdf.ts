/**
 * ATS-friendly packet export (HTML print-PDF + plain-text PDF bytes).
 * career-ops ships Playwright PDF; we ship print-ready HTML + lightweight text PDF
 * so candidates can upload without installing a CLI.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToSimpleHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (!line.trim()) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    out.push(`<p>${escapeHtml(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

export function buildPacketHtml(opts: {
  title: string;
  company: string;
  resumeMarkdown: string;
  coverLetter?: string;
  brandName?: string;
}): string {
  const brand = opts.brandName || "CareerOS";
  const resumeHtml = markdownToSimpleHtml(opts.resumeMarkdown || "");
  const coverHtml = opts.coverLetter
    ? `<section class="cover"><h1>Cover letter — ${escapeHtml(opts.company)}</h1>${markdownToSimpleHtml(opts.coverLetter)}</section>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(opts.title)} — ${escapeHtml(opts.company)} | ${escapeHtml(brand)}</title>
<style>
  @page { margin: 16mm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; line-height: 1.45; max-width: 800px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  h2 { font-size: 15px; margin: 18px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
  h3 { font-size: 13px; margin: 12px 0 4px; }
  p, li { font-size: 12.5px; }
  ul { margin: 4px 0 10px 18px; padding: 0; }
  .meta { font-size: 11px; color: #555; margin-bottom: 20px; }
  .cover { page-break-before: always; margin-top: 24px; }
  @media print { .noprint { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <p class="meta noprint">${escapeHtml(brand)} packet — use Print → Save as PDF for ATS upload. Review before submitting.</p>
  <p class="meta">${escapeHtml(opts.title)} · ${escapeHtml(opts.company)}</p>
  <section>${resumeHtml}</section>
  ${coverHtml}
  <script>window.addEventListener("load",()=>{ /* print optional */ });</script>
</body>
</html>`;
}

/** Minimal single-page text PDF (no external deps). */
export function buildSimpleTextPdf(text: string, title = "CareerOS Packet"): Uint8Array {
  const safe = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.slice(0, 95))
    .slice(0, 60)
    .join("\n")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

  const lines = safe.split("\n");
  let y = 800;
  const contentLines = [`BT /F1 10 Tf 40 ${y} Td (${title.replace(/[()\\]/g, "")}) Tj`];
  y -= 24;
  contentLines.push(`/F1 9 Tf 0 -18 Td`);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || " ";
    if (i === 0) contentLines.push(`(${line}) Tj`);
    else contentLines.push(`0 -12 Td (${line}) Tj`);
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const streamLen = Buffer.byteLength(stream, "utf8");

  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}
