/**
 * Posting legitimacy / liveness heuristics (career-ops Block G style).
 * Does not change match score — used as a hard/soft admission gate.
 */

export type LegitimacyGrade = "pass" | "warn" | "fail";

export type LegitimacyReport = {
  grade: LegitimacyGrade;
  ok: boolean;
  flags: string[];
  reasons: string[];
};

type LegitimacyInput = {
  title?: string;
  company?: string;
  description?: string;
  applyUrl?: string;
  postedAt?: string;
  sourceOfficial?: boolean;
};

const SPAM_PATTERNS =
  /whatsapp\s*only|telegram\s*only|send\s*(cv|resume)\s*to\s*\+|earn\s*₹?\s*\d+\s*(lakh|lac).*per\s*day|no\s*experience\s*needed.*\d+\s*lpa|work\s*from\s*home.*guaranteed\s*income/i;

const GHOST_PATTERNS =
  /hiring\s*urgently!!!|immediate\s*joiners\s*only!!!|100%\s*placement|data\s*entry\s*from\s*home.*\d+\s*lpa/i;

export function assessPostingLegitimacy(job: LegitimacyInput): LegitimacyReport {
  const flags: string[] = [];
  const reasons: string[] = [];
  const title = (job.title || "").trim();
  const company = (job.company || "").trim();
  const description = (job.description || "").trim();
  const blob = `${title}\n${company}\n${description}`;

  if (!title || title.length < 3) {
    flags.push("missing_title");
    reasons.push("Missing or empty job title");
  }
  if (!company || company.length < 2) {
    flags.push("missing_company");
    reasons.push("Missing employer name");
  }
  if (description.length < 120) {
    flags.push("thin_jd");
    reasons.push("Job description is unusually short");
  }
  if (SPAM_PATTERNS.test(blob) || GHOST_PATTERNS.test(blob)) {
    flags.push("spam_signals");
    reasons.push("Language matches common spam / ghost-job patterns");
  }
  if (/bit\.ly|tinyurl\.com|t\.me\/|wa\.me\//i.test(job.applyUrl || "")) {
    flags.push("suspicious_apply_url");
    reasons.push("Apply link uses a shortener or chat app — verify manually");
  }

  if (job.postedAt) {
    const t = Date.parse(job.postedAt);
    if (!Number.isNaN(t)) {
      const ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
      if (ageDays > 120) {
        flags.push("stale_posting");
        reasons.push(`Posted ~${Math.round(ageDays)} days ago — may be stale`);
      } else if (ageDays > 60) {
        flags.push("aging_posting");
        reasons.push(`Posted ~${Math.round(ageDays)} days ago — confirm still open`);
      }
    }
  }

  if (job.sourceOfficial === false && flags.includes("thin_jd")) {
    flags.push("unofficial_thin");
    reasons.push("Unofficial source with thin JD — paste official careers URL if possible");
  }

  const hardFail = flags.some((f) =>
    ["spam_signals", "missing_title", "suspicious_apply_url"].includes(f),
  );
  const warnOnly = !hardFail && flags.length > 0;

  if (hardFail) {
    return { grade: "fail", ok: false, flags, reasons };
  }
  if (warnOnly) {
    return { grade: "warn", ok: true, flags, reasons };
  }
  return {
    grade: "pass",
    ok: true,
    flags: [],
    reasons: job.sourceOfficial ? ["Looks like a normal official posting"] : ["No red flags detected"],
  };
}

/** HEAD/GET probe — soft liveness (never blocks on network errors). */
export async function probeJobUrlLiveness(
  url: string,
): Promise<{ live: boolean; status?: number; checked: boolean }> {
  if (!url) return { live: false, checked: false };
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "CareerOSBot/1.0", Accept: "text/html" },
      signal: AbortSignal.timeout(8_000),
    });
    const status = res.status;
    if (status === 404 || status === 410) return { live: false, status, checked: true };
    const text = (await res.text()).slice(0, 4000).toLowerCase();
    if (
      /no longer available|job has been filled|position has been closed|this job is closed|requisition not found/i.test(
        text,
      )
    ) {
      return { live: false, status, checked: true };
    }
    return { live: status >= 200 && status < 400, status, checked: true };
  } catch {
    return { live: true, checked: false };
  }
}
