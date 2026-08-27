/**
 * Ingest job URLs from LinkedIn / Naukri / Indeed alert emails or pasted text.
 * We never scrape LinkedIn login walls — candidate pastes the alert or JD.
 */

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

const JOBISH =
  /linkedin\.com\/jobs|naukri\.com\/job|indeed\.|foundit\.|shine\.com|greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|successfactors\.|smartrecruiters\.com|ripplehire\.com|\/jobs\/|\/job\/|jobdetail|requisition/i;

export function extractJobUrlsFromAlertText(text: string): string[] {
  if (!text?.trim()) return [];
  const found = text.match(URL_RE) || [];
  const cleaned = found.map((u) =>
    u
      .replace(/[.,;:!?)]+$/g, "")
      .replace(/&amp;/g, "&")
      // LinkedIn tracking wrappers often include long query strings — keep as-is for extract
      .trim(),
  );
  const preferred = cleaned.filter((u) => JOBISH.test(u));
  const rest = cleaned.filter((u) => !JOBISH.test(u));
  const ordered = [...preferred, ...rest];
  return [...new Set(ordered)].slice(0, 8);
}

export function looksLikeJobAlertEmail(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /linkedin job alert|jobs you may be interested|new jobs for you|naukri.*alert|indeed job alert|recommended jobs/i.test(
      t,
    ) || (extractJobUrlsFromAlertText(text).length >= 2 && t.length > 400)
  );
}

export type AlertIngestResult = {
  urls: string[];
  isAlert: boolean;
  hint: string;
};

export function ingestAlertOrPaste(text: string): AlertIngestResult {
  const urls = extractJobUrlsFromAlertText(text);
  const isAlert = looksLikeJobAlertEmail(text);
  if (urls.length) {
    return {
      urls,
      isAlert,
      hint: isAlert
        ? `Found ${urls.length} link(s) in alert — CareerOS will open the first job-detail URL (you still confirm apply).`
        : `Found ${urls.length} URL(s) — extracting the best job-detail link.`,
    };
  }
  return {
    urls: [],
    isAlert: false,
    hint: "No job URLs found. Paste a careers/ATS link or the full JD text.",
  };
}
