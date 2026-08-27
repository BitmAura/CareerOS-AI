import mammoth from "mammoth";

/**
 * PDF extractors often emit kerned names as "D P r a d e e p K u m a r".
 * Collapse letter-spaced runs into real words.
 */
export function normalizeExtractedText(raw: string): string {
  if (!raw) return "";
  let text = raw.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");

  // "D P r a d e e p" / "S A P" style — 3+ single letters separated by spaces
  text = text.replace(/\b(?:[A-Za-z]\s+){2,}[A-Za-z]\b/g, (m) => m.replace(/\s+/g, ""));

  // Soft-hyphen / weird separators
  text = text.replace(/\u00ad/g, "");

  // Collapse horizontal whitespace but keep newlines
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n");

  // Too many blank lines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Extract resume text.
 * 1) Optional MarkItDown worker at RESUME_PARSE_URL (crazy-ai-stack)
 * 2) Local mammoth (DOCX) / unpdf (PDF)
 */
export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const workerUrl = process.env.RESUME_PARSE_URL?.replace(/\/$/, "");
  if (workerUrl) {
    try {
      const form = new FormData();
      const blob = new Blob([new Uint8Array(buffer)], {
        type: mimeType || "application/octet-stream",
      });
      form.append("file", blob, fileName || "resume.bin");
      const res = await fetch(`${workerUrl}/extract-text`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { text?: string };
        if (data.text && data.text.trim().length >= 20) {
          return normalizeExtractedText(data.text);
        }
      }
    } catch (e) {
      console.warn("RESUME_PARSE_URL failed, using local extract", e);
    }
  }

  const lower = fileName.toLowerCase();
  const isDocx =
    mimeType.includes("wordprocessingml") ||
    mimeType === "application/msword" ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc");

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeExtractedText(result.value || "");
  }

  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : String(text || "");
    return normalizeExtractedText(joined);
  } catch {
    return normalizeExtractedText(buffer.toString("utf8").replace(/[^\S\n]+/g, " "));
  }
}
