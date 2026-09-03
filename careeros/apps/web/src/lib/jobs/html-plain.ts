/**
 * HTML → plain text for JD / Workday / Greenhouse content.
 * Inspired by MarkItDown HtmlConverter cleanup (strip scripts/styles, decode entities).
 */

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code > 0 && code < 65536 ? String.fromCharCode(code) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return code > 0 && code < 65536 ? String.fromCharCode(code) : " ";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Guess location from free text when ATS omits structured location. */
export function guessLocationFromText(text: string): string {
  const blob = text || "";
  const india =
    blob.match(
      /\b(Bengaluru|Bangalore|Mumbai|Pune|Chennai|Hyderabad|Delhi|Gurugram|Gurgaon|Noida|Kolkata|Ahmedabad|Coimbatore|Nashik|Jaipur)(?:[,\s]+(?:India|IN))?\b/i,
    ) || blob.match(/\bIndia\b/i);
  if (india) return india[0];
  return "";
}
