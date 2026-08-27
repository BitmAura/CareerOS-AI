import { randomUUID } from "crypto";
import type { ResumeSuggestion } from "@/lib/db/types";

export type AtsCategory = "parse" | "keywords" | "impact" | "format" | "completeness";

export type AtsCheck = {
  id: string;
  category: AtsCategory;
  label: string;
  passed: boolean;
  hint: string;
};

export type AtsScorecard = {
  overall: number;
  parse: number;
  keywords: number;
  impact: number;
  format: number;
  completeness: number;
  checks: AtsCheck[];
};

export type KeywordGapReport = {
  jobKeywords: string[];
  matched: string[];
  missing: string[];
  coveragePercent: number;
};

const MANUFACTURING_LEXICON = [
  // Core procurement / purchase
  "procurement",
  "purchase",
  "sourcing",
  "strategic sourcing",
  "vendor management",
  "vendor development",
  "vendor evaluation",
  "negotiation",
  "rate contract",
  "price variance",
  "ppv",
  "capex",
  "opex",
  // Supply chain
  "supply chain",
  "logistics",
  "inventory",
  "inventory management",
  "otif",
  "mrp",
  "bom",
  "demand planning",
  "forecasting",
  // ERP / systems
  "sap mm",
  "sap",
  "erp",
  "mes",
  "scada",
  "plc",
  // Manufacturing / quality / lean
  "quality",
  "six sigma",
  "lean",
  "tpm",
  "kaizen",
  "5s",
  "ppc",
  "iso",
  "production",
  "maintenance",
  // Finance / India-specific
  "cost reduction",
  "automation",
];

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function extractKeywordsFromJd(jd: string): string[] {
  const lower = jd.toLowerCase();
  const found = new Set<string>();
  for (const kw of MANUFACTURING_LEXICON) {
    if (lower.includes(kw)) found.add(kw);
  }
  // Pull capitalized skill-like tokens (3+ chars) that aren't generic filler words
  const tokens = jd.match(/\b[A-Za-z][A-Za-z+/&-]{2,}\b/g) || [];
  const stop = new Set([
    "the", "and", "for", "with", "from", "that", "this", "will", "have",
    "years", "year", "role", "job", "team", "work", "experience", "responsible",
    "ability", "must", "should", "can", "our", "you", "your", "are", "not",
    "but", "has", "its", "any", "all", "also", "been", "into", "over", "such",
    "ensure", "include", "required", "preferred", "knowledge", "skills",
    "strong", "good", "excellent", "well", "high", "key", "position", "candidate",
    "company", "business", "team", "across", "multiple", "various", "within",
    "degree", "education", "bachelor", "master", "related", "field", "major",
  ]);
  for (const t of tokens) {
    const l = t.toLowerCase();
    if (!stop.has(l) && l.length > 4) found.add(l);
  }
  return [...found].slice(0, 40);
}

export function buildAtsScorecard(rawText: string, targetJd?: string): {
  scorecard: AtsScorecard;
  suggestions: ResumeSuggestion[];
  keywordGap?: KeywordGapReport;
} {
  const text = rawText || "";
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const checks: AtsCheck[] = [];
  const suggestions: ResumeSuggestion[] = [];

  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
  const hasPhone = /(\+?\d[\d\s\-()]{8,}\d)/.test(text);
  const hasSummary = /(summary|profile|objective)/i.test(text);
  const hasSkills = /(skills|competenc|technical)/i.test(text);
  const hasExperience = /(experience|employment|work history)/i.test(text) || /\b(19|20)\d{2}\b/.test(text);
  const hasEducation = /(education|degree|b\.?tech|m\.?tech|mba|bachelor|master)/i.test(text);
  const hasMetrics = /\d+%|\d+\s*(lakh|lpa|crore|years|yrs|cr|rs\s*\.|rs\.?)\b/i.test(text);
  const hasActionVerbs =
    /(led|managed|owned|delivered|reduced|improved|negotiated|implemented|drove|built|spearheaded|launched|developed|achieved|optimized|streamlined|established|directed|oversaw|coordinated)/i.test(text);
  const hasTables = /\t{2,}|\|.+\|/.test(text);
  const hasWeirdChars = /[□■◆●]/.test(text);
  // Detect remaining PDF letter-spacing damage: many 1-char tokens in a row
  const hasGlyphSpacing = /\b(?:[A-Za-z]\s+){4,}[A-Za-z]\b/.test(text);
  const manufacturingHits = MANUFACTURING_LEXICON.filter((k) => lower.includes(k));

  // New: date format check
  const hasBadDateFormat = /\b(till date|to date|ongoing|till now|jan\d{2}|feb\d{2}|mar\d{2}|apr\d{2}|may\d{2}|jun\d{2}|jul\d{2}|aug\d{2}|sep\d{2}|oct\d{2}|nov\d{2}|dec\d{2})\b/i.test(text);

  // New: bullet analysis
  const allBullets = text.match(/^[-•*]\s*.+/gm) || [];
  const longBullets = allBullets.filter((b) => b.split(/\s+/).length > 38);
  const bulletLengthOk = allBullets.length === 0 || longBullets.length / allBullets.length < 0.3;
  const metricBullets = allBullets.filter((b) => /\d+[%\s]|\brs\b|\blpa\b|\bcrore\b|\blakh\b/i.test(b));
  const quantRate = allBullets.length > 0 ? metricBullets.length / allBullets.length : 1;

  // New: section order check (Summary before Experience)
  const summaryPos = text.search(/(summary|profile|objective)/i);
  const experiencePos = text.search(/(experience|employment|work history)/i);
  const sectionOrderOk = summaryPos === -1 || experiencePos === -1 || summaryPos < experiencePos;

  // Parse
  checks.push({
    id: randomUUID(),
    category: "parse",
    label: "Contact email detected",
    passed: hasEmail,
    hint: "Add a plain-text email in the header (not only in an image).",
  });
  checks.push({
    id: randomUUID(),
    category: "parse",
    label: "Phone number detected",
    passed: hasPhone,
    hint: "Add a phone with country code, e.g. +91…",
  });
  checks.push({
    id: randomUUID(),
    category: "parse",
    label: "Experience section / dates present",
    passed: hasExperience,
    hint: "Use a clear Experience heading and YYYY dates.",
  });
  checks.push({
    id: randomUUID(),
    category: "parse",
    label: "Education section present",
    passed: hasEducation,
    hint: "Add Education with degree and year.",
  });

  // Completeness
  checks.push({
    id: randomUUID(),
    category: "completeness",
    label: "Professional summary / profile",
    passed: hasSummary,
    hint: "Add a 3-line Summary with years, domain, target role.",
  });
  checks.push({
    id: randomUUID(),
    category: "completeness",
    label: "Skills section",
    passed: hasSkills || manufacturingHits.length >= 3,
    hint: "Add a Skills line with ATS keywords (SAP MM, Procurement…).",
  });
  checks.push({
    id: randomUUID(),
    category: "completeness",
    label: "Healthy length (250–700 words)",
    passed: wordCount >= 250 && wordCount <= 700,
    hint: wordCount < 250 ? "Expand with 3–5 metric bullets per recent role." : "Trim older roles; keep last 10–12 years.",
  });

  // Impact
  checks.push({
    id: randomUUID(),
    category: "impact",
    label: "Quantified achievements",
    passed: hasMetrics,
    hint: "Add %, LPA, OTIF, cost saved, vendor count metrics.",
  });
  checks.push({
    id: randomUUID(),
    category: "impact",
    label: "Strong action verbs",
    passed: hasActionVerbs,
    hint: "Start bullets with Led / Negotiated / Reduced / Owned.",
  });

  checks.push({
    id: randomUUID(),
    category: "format",
    label: "No heavy table/pipe layout",
    passed: !hasTables,
    hint: "Avoid multi-column tables; use simple bullets ATS can read.",
  });
  checks.push({
    id: randomUUID(),
    category: "format",
    label: "No decorative symbol noise",
    passed: !hasWeirdChars,
    hint: "Replace icons/symbols with plain text bullets.",
  });
  checks.push({
    id: randomUUID(),
    category: "format",
    label: "Clean text extract (no letter-spaced PDF glyphs)",
    passed: !hasGlyphSpacing,
    hint: "PDF extract looks like 'D P r a d e e p'. Re-upload DOCX, paste text, or click Generate improved (we auto-fix).",
  });
  checks.push({
    id: randomUUID(),
    category: "format",
    label: "Date format ATS-readable (MMM YYYY – MMM YYYY)",
    passed: !hasBadDateFormat,
    hint: "Use 'Jan 2020 – Mar 2023' format. Avoid 'till date', 'ongoing', or compressed '2020-23'.",
  });
  checks.push({
    id: randomUUID(),
    category: "format",
    label: "Bullet length concise (under 35 words each)",
    passed: bulletLengthOk,
    hint: "Trim long bullets to 1–2 lines. ATS truncates overly long bullets. Target 15–30 words per bullet.",
  });
  checks.push({
    id: randomUUID(),
    category: "format",
    label: "Professional Summary appears before Experience",
    passed: sectionOrderOk,
    hint: "Move Professional Summary above Experience section. ATS reads top-to-bottom.",
  });
  checks.push({
    id: randomUUID(),
    category: "impact",
    label: "50%+ bullets have metrics / numbers",
    passed: allBullets.length === 0 || quantRate >= 0.5,
    hint: `Only ${Math.round(quantRate * 100)}% of your bullets have numbers. Add %, Rs., OTIF%, days reduced, vendor count, cost saved.`,
  });

  // Keywords (beachhead baseline) — threshold scaled with larger lexicon (8 of 42)
  const keywordBaseScore = clamp((manufacturingHits.length / 8) * 100);
  checks.push({
    id: randomUUID(),
    category: "keywords",
    label: "Manufacturing / SCM keywords present",
    passed: manufacturingHits.length >= 4,
    hint: `Add missing terms. Found ${manufacturingHits.length}: ${manufacturingHits.slice(0, 6).join(", ") || "none"}.`,
  });

  let keywordGap: KeywordGapReport | undefined;
  if (targetJd?.trim()) {
    const jobKeywords = extractKeywordsFromJd(targetJd);
    const matched = jobKeywords.filter((k) => lower.includes(k));
    const missing = jobKeywords.filter((k) => !lower.includes(k));
    const coveragePercent = jobKeywords.length
      ? clamp((matched.length / jobKeywords.length) * 100)
      : 0;
    keywordGap = { jobKeywords, matched, missing, coveragePercent };
    checks.push({
      id: randomUUID(),
      category: "keywords",
      label: `JD keyword coverage ${coveragePercent}%`,
      passed: coveragePercent >= 55,
      hint:
        missing.length > 0
          ? `Missing from JD: ${missing.slice(0, 12).join(", ")}`
          : "Strong overlap with the pasted job description.",
    });
  }

  const scoreCat = (cat: AtsCategory) => {
    const subset = checks.filter((c) => c.category === cat);
    if (!subset.length) return 70;
    return clamp((subset.filter((c) => c.passed).length / subset.length) * 100);
  };

  const parse = scoreCat("parse");
  const completeness = scoreCat("completeness");
  const impact = scoreCat("impact");
  const format = scoreCat("format");
  const keywords = targetJd?.trim()
    ? clamp(keywordBaseScore * 0.35 + (keywordGap?.coveragePercent || 0) * 0.65)
    : clamp(keywordBaseScore);

  const overall = clamp(parse * 0.2 + keywords * 0.25 + impact * 0.25 + format * 0.1 + completeness * 0.2);

  for (const c of checks.filter((x) => !x.passed)) {
    suggestions.push({
      id: randomUUID(),
      title: c.label,
      detail: c.hint,
      severity: c.category === "impact" || c.category === "parse" ? "high" : "medium",
      category:
        c.category === "keywords"
          ? "manufacturing"
          : c.category === "impact"
            ? "impact"
            : c.category === "format"
              ? "ats"
              : "structure",
    });
  }

  return {
    scorecard: { overall, parse, keywords, impact, format, completeness, checks },
    suggestions,
    keywordGap,
  };
}

