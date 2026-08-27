import { randomUUID } from "crypto";
import type { ParsedResume, ResumeSuggestion } from "@/lib/db/types";
import { llmGenerate } from "@/lib/ai/llm";
import {
  buildAtsScorecard,
  type AtsScorecard,
  type KeywordGapReport,
} from "@/lib/resume/ats-scorecard";
import { normalizeExtractedText } from "@/lib/resume/extract";
import { parsedDataToMarkdown } from "@/lib/resume/to-markdown";

export type AnalysisResult = {
  parsedData: ParsedResume;
  suggestions: ResumeSuggestion[];
  aiScore: number;
  improvedMarkdown?: string;
  atsScorecard?: AtsScorecard;
  keywordGap?: KeywordGapReport;
};

const SKILL_KEYWORDS = [
  // Core procurement / purchase
  "procurement",
  "purchase",
  "sourcing",
  "strategic sourcing",
  "vendor management",
  "vendor development",
  "negotiation",
  "rate contract",
  "capex",
  "opex",
  // Supply chain
  "supply chain",
  "logistics",
  "inventory",
  "inventory management",
  "sap mm",
  "sap",
  "erp",
  "otif",
  "mrp",
  "bom",
  "forecasting",
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
  // Modern
  "cost reduction",
  "excel",
  "mes",
  "automation",
];

function titleCaseSkill(k: string) {
  if (k.toLowerCase() === "sap mm") return "SAP MM";
  if (k.toLowerCase() === "sap") return "SAP";
  if (k.toLowerCase() === "otif") return "OTIF";
  if (k.toLowerCase() === "tpm") return "TPM";
  if (k.toLowerCase() === "erp") return "ERP";
  if (k.toLowerCase() === "iso") return "ISO";
  if (k.toLowerCase() === "mrp") return "MRP";
  if (k.toLowerCase() === "bom") return "BOM";
  if (k.toLowerCase() === "ppc") return "PPC";
  if (k.toLowerCase() === "mes") return "MES";
  if (k.toLowerCase() === "5s") return "5S";
  if (k.toLowerCase() === "capex") return "CAPEX";
  if (k.toLowerCase() === "opex") return "OPEX";
  return k.replace(/\b\w/g, (c) => c.toUpperCase());
}

function splitSections(text: string): Record<string, string> {
  const headers =
    /^(professional\s+summary|summary|profile|objective|core\s+skills|skills|technical\s+skills|competencies|experience|work\s+experience|employment|professional\s+experience|education|projects|certifications|achievements)\s*$/gim;
  const indices: Array<{ key: string; start: number; headerLen: number }> = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(headers.source, "gim");
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase().replace(/\s+/g, " ");
    const normalized =
      key.includes("summary") || key.includes("profile") || key.includes("objective")
        ? "summary"
        : key.includes("skill") || key.includes("competenc")
          ? "skills"
          : key.includes("education")
            ? "education"
            : key.includes("experience") || key.includes("employment")
              ? "experience"
              : key;
    indices.push({ key: normalized, start: m.index, headerLen: m[0].length });
  }
  const out: Record<string, string> = {};
  if (!indices.length) {
    out.body = text;
    return out;
  }
  for (let i = 0; i < indices.length; i++) {
    const cur = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1].start : text.length;
    const body = text.slice(cur.start + cur.headerLen, end).trim();
    out[cur.key] = out[cur.key] ? `${out[cur.key]}\n${body}` : body;
  }
  const first = indices[0].start;
  if (first > 0) out.header = text.slice(0, first).trim();
  return out;
}

function parseExperienceBlock(block: string): NonNullable<ParsedResume["experience"]> {
  if (!block?.trim()) return [];
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const roles: NonNullable<ParsedResume["experience"]> = [];
  let current: NonNullable<ParsedResume["experience"]>[number] | null = null;

  const dateLine =
    /^(.+?)\s+[|–—-]\s+(.+?)\s*[|–—-]\s*([A-Za-z]{3,9}\s+\d{4}|\d{4})\s*[–—to\-]+\s*([A-Za-z]{3,9}\s+\d{4}|\d{4}|Present|Current)/i;
  const roleCompany = /^(.{3,80}?)\s+(?:at|@|—|-|–)\s+(.{2,80})$/i;

  for (const line of lines) {
    if (/^[-•*●]/.test(line) || /^\d+[.)]/.test(line)) {
      const bullet = line.replace(/^[-•*●]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
      if (current && bullet) {
        current.bullets = [...(current.bullets || []), bullet];
      }
      continue;
    }

    const dm = line.match(dateLine);
    if (dm) {
      if (current) roles.push(current);
      current = {
        role: dm[1].trim(),
        company: dm[2].trim(),
        startDate: dm[3].trim(),
        endDate: dm[4].trim(),
        bullets: [],
      };
      continue;
    }

    const rc = line.match(roleCompany);
    if (rc && line.length < 100) {
      if (current) roles.push(current);
      current = {
        role: rc[1].trim(),
        company: rc[2].trim(),
        bullets: [],
      };
      continue;
    }

    // Title-like line starting a new role
    if (
      line.length < 90 &&
      !/@/.test(line) &&
      !/^\+?\d/.test(line) &&
      (/\b(manager|lead|engineer|executive|analyst|officer|head|specialist|buyer|coordinator)\b/i.test(
        line,
      ) ||
        /\b(19|20)\d{2}\b/.test(line))
    ) {
      if (current) roles.push(current);
      const parts = line.split(/\s+[|–—]\s+/);
      current = {
        role: parts[0]?.trim() || line,
        company: parts[1]?.trim() || "",
        startDate: parts[2]?.trim(),
        endDate: parts[3]?.trim(),
        bullets: [],
      };
      continue;
    }

    if (current && line.length > 25) {
      current.bullets = [...(current.bullets || []), line];
    }
  }
  if (current) roles.push(current);
  return roles.slice(0, 8).map((r) => ({
    ...r,
    bullets: (r.bullets || []).slice(0, 8),
  }));
}

function parseEducationBlock(block: string): NonNullable<ParsedResume["education"]> {
  if (!block?.trim()) return [];
  return block
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => {
      const year = line.match(/\b((?:19|20)\d{2})\b/)?.[1];
      const parts = line.split(/[–—|,@]/).map((p) => p.trim()).filter(Boolean);
      return {
        degree: parts[0] || line,
        institution: parts[1] || "",
        year: year || parts[2] || "",
      };
    });
}

function heuristicAnalyze(rawText: string): AnalysisResult {
  const text = normalizeExtractedText(rawText || "");
  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections = splitSections(text);

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = text.match(/(\+?\d[\d\s\-()]{8,}\d)/);

  const skills = SKILL_KEYWORDS.filter((k) => lower.includes(k)).map(titleCaseSkill);
  // de-dupe preserving order
  const uniqueSkills = [...new Set(skills)];

  const hasMetrics = /\d+%|\d+\s*(lakh|lpa|crore|years|yrs)/i.test(text);
  const hasActionVerbs =
    /(led|managed|owned|delivered|reduced|improved|negotiated|implemented)/i.test(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const suggestions: ResumeSuggestion[] = [];

  if (!hasMetrics) {
    suggestions.push({
      id: randomUUID(),
      title: "Add quantified achievements",
      detail: "Include metrics (cost saved %, OTIF %, inventory days, vendor count) under each role.",
      severity: "high",
      category: "impact",
    });
  }
  if (!hasActionVerbs) {
    suggestions.push({
      id: randomUUID(),
      title: "Start bullets with strong verbs",
      detail: "Use Led / Negotiated / Reduced / Owned instead of Responsible for.",
      severity: "high",
      category: "impact",
    });
  }
  if (uniqueSkills.length < 5) {
    suggestions.push({
      id: randomUUID(),
      title: "Expand manufacturing-relevant skills",
      detail: "Add SAP MM, vendor management, inventory planning, lean/TPM keywords for beachhead roles.",
      severity: "medium",
      category: "manufacturing",
    });
  }
  if (wordCount < 180) {
    suggestions.push({
      id: randomUUID(),
      title: "Resume looks thin",
      detail: "Aim for 350–600 words with 3–5 bullets per recent role.",
      severity: "medium",
      category: "structure",
    });
  }
  if (wordCount > 900) {
    suggestions.push({
      id: randomUUID(),
      title: "Tighten length for ATS",
      detail: "Cut older roles to one line; keep last 10–12 years detailed.",
      severity: "low",
      category: "ats",
    });
  }
  if (!/(summary|profile|objective)/i.test(text)) {
    suggestions.push({
      id: randomUUID(),
      title: "Add a 3-line professional summary",
      detail: "Open with years of experience, domain (procurement/SCM), and target role.",
      severity: "medium",
      category: "structure",
    });
  }

  let score = 55;
  if (hasMetrics) score += 12;
  if (hasActionVerbs) score += 10;
  if (uniqueSkills.length >= 5) score += 8;
  if (emailMatch) score += 3;
  if (wordCount >= 250 && wordCount <= 700) score += 8;
  score = Math.min(
    92,
    Math.max(40, score - suggestions.filter((s) => s.severity === "high").length * 4),
  );

  const ats = buildAtsScorecard(text);
  const mergedSuggestions = [...ats.suggestions, ...suggestions].slice(0, 12);

  const headerLines = (sections.header || lines.slice(0, 6).join("\n")).split(/\n/).filter(Boolean);
  const nameLine =
    headerLines.find((l) => !/@/.test(l) && !/^\+?\d/.test(l) && l.length < 60) ||
    lines[0]?.slice(0, 80) ||
    "Professional";

  const summaryFromSection =
    sections.summary?.replace(/\s+/g, " ").trim().slice(0, 600) ||
    undefined;

  const experience = parseExperienceBlock(sections.experience || "");
  const education = parseEducationBlock(sections.education || "");

  // If no structured experience, keep a few strong lines as bullets under a generic role
  const fallbackExperience =
    experience.length > 0
      ? experience
      : [
          {
            role: "Professional experience",
            company: "See original resume",
            bullets: lines
              .filter((l) => l.length > 40 && !/@/.test(l))
              .slice(0, 10)
              .map((l) => l.replace(/^[-•*]\s*/, "")),
          },
        ];

  const parsedData: ParsedResume = {
    contact: {
      name: nameLine.replace(/^#\s*/, "").slice(0, 80),
      email: emailMatch?.[0],
      phone: phoneMatch?.[0]?.replace(/\s+/g, " ").trim(),
    },
    summary:
      summaryFromSection ||
      `Manufacturing / operations professional focused on procurement and supply chain. Seeking senior roles where cost, OTIF, and vendor performance drive plant outcomes.`,
    skills: uniqueSkills.length
      ? uniqueSkills
      : ["Procurement", "Supply Chain", "Vendor Management", "Negotiation", "SAP"],
    experience: fallbackExperience,
    education,
    gaps: mergedSuggestions.map((s) => s.title),
  };

  return {
    parsedData,
    suggestions: mergedSuggestions,
    aiScore: ats.scorecard.overall || score,
    atsScorecard: ats.scorecard,
    keywordGap: ats.keywordGap,
    improvedMarkdown: buildAtsResumeMarkdown(parsedData),
  };
}

/** Full ATS-friendly Markdown resume — never a “notes” dump. */
export function buildAtsResumeMarkdown(data: ParsedResume): string {
  return parsedDataToMarkdown({
    ...data,
    contact: {
      ...data.contact,
      name: normalizeExtractedText(data.contact?.name || "Professional").replace(/\s+/g, " "),
    },
  });
}

function buildImprovedMarkdown(rawText: string, analysis: AnalysisResult): string {
  if (analysis.parsedData?.experience?.length || analysis.parsedData?.summary) {
    return buildAtsResumeMarkdown(analysis.parsedData);
  }
  // Last resort: re-heuristic on cleaned text
  const cleaned = normalizeExtractedText(rawText);
  const again = heuristicAnalyze(cleaned);
  return buildAtsResumeMarkdown(again.parsedData);
}

async function geminiAnalyze(rawText: string): Promise<AnalysisResult | null> {
  const prompt = `You are CareerOS AI resume coach for Indian manufacturing professionals (procurement, supply chain, production, quality, maintenance).

Analyze this resume text and return ONLY valid JSON with this shape:
{
  "aiScore": number 0-100,
  "parsedData": {
    "contact": {"name":"", "email":"", "phone":"", "location":""},
    "summary": "",
    "experience": [{"role":"","company":"","startDate":"","endDate":"","bullets":[""]}],
    "education": [{"degree":"","institution":"","year":""}],
    "skills": [""],
    "gaps": [""]
  },
  "suggestions": [{"title":"","detail":"","severity":"high|medium|low","category":"ats|impact|skills|structure|manufacturing"}],
  "improvedMarkdown": "full rewritten ATS-friendly resume in Markdown with H1 name, contact line, Professional Summary, Skills, Experience (### Role — Company, dates, bullet achievements with metrics), Education. Plain text only — no tables, no icons, no 'Improvements Applied' section."
}

Resume text:
"""
${rawText.slice(0, 14000)}
"""`;

  const text = await llmGenerate(prompt, { temperature: 0.3, maxTokens: 4096 });
  if (!text) return null;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult & {
    suggestions?: Array<Partial<ResumeSuggestion> & { title?: string; detail?: string }>;
  };

  const suggestions: ResumeSuggestion[] = (parsed.suggestions || []).map((s) => ({
    id: randomUUID(),
    title: s.title || "Suggestion",
    detail: s.detail || "",
    severity: (s.severity as ResumeSuggestion["severity"]) || "medium",
    category: (s.category as ResumeSuggestion["category"]) || "structure",
  }));

  const parsedData = parsed.parsedData || {};
  let improvedMarkdown = parsed.improvedMarkdown;
  if (!improvedMarkdown || /improvements applied/i.test(improvedMarkdown) || improvedMarkdown.length < 200) {
    improvedMarkdown = buildAtsResumeMarkdown(parsedData);
  }

  return {
    aiScore: Number(parsed.aiScore) || 70,
    parsedData,
    suggestions,
    improvedMarkdown,
  };
}

export async function analyzeResumeText(
  rawText: string,
  options?: { targetJd?: string },
): Promise<AnalysisResult> {
  const targetJd = options?.targetJd;
  const cleaned = normalizeExtractedText(rawText || "");

  if (!cleaned || cleaned.length < 40) {
    const ats = buildAtsScorecard(cleaned || "", targetJd);
    return {
      aiScore: ats.scorecard.overall,
      parsedData: { gaps: ["Could not extract enough text — paste resume text manually"] },
      suggestions: [
        {
          id: randomUUID(),
          title: "Text extraction failed",
          detail:
            "Upload a text-based PDF/DOCX or paste resume text. Scanned image PDFs need OCR (not on free tier).",
          severity: "high",
          category: "structure",
        },
        ...ats.suggestions,
      ],
      atsScorecard: ats.scorecard,
      keywordGap: ats.keywordGap,
    };
  }

  const ats = buildAtsScorecard(cleaned, targetJd);

  try {
    const gemini = await geminiAnalyze(cleaned);
    if (gemini) {
      if (!gemini.improvedMarkdown) {
        gemini.improvedMarkdown = buildImprovedMarkdown(cleaned, gemini);
      }
      // Strip accidental notes section if model added it
      gemini.improvedMarkdown = gemini.improvedMarkdown
        .replace(/\n## Improvements Applied[\s\S]*$/i, "")
        .trim();
      gemini.atsScorecard = ats.scorecard;
      gemini.keywordGap = ats.keywordGap;
      gemini.aiScore = ats.scorecard.overall;
      gemini.suggestions = [...ats.suggestions, ...(gemini.suggestions || [])].slice(0, 14);
      if (gemini.parsedData?.contact?.name) {
        gemini.parsedData.contact.name = normalizeExtractedText(gemini.parsedData.contact.name);
      }
      return gemini;
    }
  } catch (e) {
    console.error("analyzeResumeText gemini failed", e);
  }

  const heuristic = heuristicAnalyze(cleaned);
  heuristic.atsScorecard = ats.scorecard;
  heuristic.keywordGap = ats.keywordGap;
  heuristic.aiScore = ats.scorecard.overall;
  heuristic.suggestions = [...ats.suggestions, ...heuristic.suggestions].slice(0, 14);
  heuristic.improvedMarkdown = buildAtsResumeMarkdown(heuristic.parsedData);
  return heuristic;
}

export async function rewriteResumeSection(
  section: "summary" | "bullet" | "skills",
  content: string,
  context?: string,
): Promise<string> {
  const fallbacks: Record<string, string> = {
    summary:
      content.trim() ||
      "Manufacturing professional with procurement and supply-chain ownership. Proven in cost, OTIF, and vendor performance for plant operations.",
    bullet: content.replace(/^(responsible for|helped with)\s*/i, "Led ").trim() || content,
    skills: content,
  };

  const prompt = `Rewrite this resume ${section} for an ATS-friendly Indian manufacturing resume. Return ONLY the rewritten text, no quotes.
Context: ${context || "procurement / supply chain / plant ops"}
Input:
"""
${content.slice(0, 2000)}
"""`;

  const text = await llmGenerate(prompt, { temperature: 0.4, maxTokens: 512 });
  return text?.trim() || fallbacks[section] || content;
}

export async function generateResumeFromOutline(outline: {
  name: string;
  years?: string;
  targetRole?: string;
  skills?: string[];
  roles?: Array<{ role: string; company: string; years?: string; highlights?: string }>;
}): Promise<ParsedResume> {
  const skills = outline.skills?.length
    ? outline.skills
    : ["Procurement", "SAP MM", "Negotiation", "Supply Chain", "Vendor Management"];
  const experience =
    outline.roles?.map((r) => ({
      role: r.role,
      company: r.company,
      startDate: r.years?.split("-")[0]?.trim(),
      endDate: r.years?.split("-")[1]?.trim() || "Present",
      bullets: [
        r.highlights ||
          `Owned ${r.role.toLowerCase()} outcomes for ${r.company}, driving cost and delivery KPIs.`,
        "Partnered with plant, quality, and finance stakeholders to improve OTIF and inventory turns.",
        "Negotiated vendor contracts and standardized sourcing processes.",
      ],
    })) || [];

  const prompt = `Create a structured ATS resume JSON for manufacturing careers in India from this outline. Return ONLY JSON matching:
{"contact":{"name":"","email":"","phone":"","location":""},"summary":"","skills":[],"experience":[{"role":"","company":"","startDate":"","endDate":"","bullets":[]}],"education":[{"degree":"","institution":"","year":""}]}
Outline: ${JSON.stringify(outline)}`;

  const text = await llmGenerate(prompt, { temperature: 0.4, maxTokens: 2048 });
  if (!text) {
    return {
      contact: { name: outline.name },
      summary: `${outline.years || "Experienced"} professional targeting ${outline.targetRole || "manufacturing leadership"} roles. Strong in procurement, supply chain, and plant-facing operations.`,
      skills,
      experience,
      education: [],
    };
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { contact: { name: outline.name }, summary: "", skills, experience, education: [] };
  }
  return JSON.parse(match[0]) as ParsedResume;
}

/** Template-specific focus instructions for the LLM. */
const TEMPLATE_CONTEXTS: Record<string, string> = {
  ats_classic:
    "Standard ATS-clean layout. Balance all sections equally. Ensure contact, summary, skills, experience, education order.",
  procurement_scm:
    "Procurement / Purchase / SCM focus. Lead summary with cost reduction %, OTIF, vendor count. Prioritize SAP MM, vendor development, rate contracts, price variance reduction, spend analytics in skills. Each experience bullet must reference a cost, delivery, or vendor metric.",
  plant_ops:
    "Plant operations focus. Lead summary with OEE, downtime %, production volumes. Prioritize TPM, lean, 5S, kaizen, preventive maintenance, SCADA/PLC in skills. Each experience bullet should reference uptime, yield, safety, or throughput metric.",
};

export async function improveResumeMarkdown(
  rawText: string,
  analysis: AnalysisResult,
  template?: string,
): Promise<string> {
  const cleaned = normalizeExtractedText(rawText);
  const templateCtx = TEMPLATE_CONTEXTS[template || "ats_classic"] || TEMPLATE_CONTEXTS.ats_classic;
  const prompt = `Rewrite this resume into a clean ATS-friendly Markdown resume for manufacturing careers in India.

Template focus: ${templateCtx}

Rules:
- H1 = candidate full name (normal spacing, NOT letter-spaced)
- Contact line: email | phone | location | LinkedIn (if present)
- Sections in this order: Professional Summary, Skills, Experience, Education
- Skills: single line, separated by " · " (middle dot), no columns or tables
- Experience: ### Role — Company, then dates on next line (MMM YYYY – MMM YYYY or Present), then 3–6 metric bullets starting with strong past-tense verbs
- Every bullet must contain at least one number, %, Rs. value, or measurable outcome
- Plain text only — no tables, icons, columns, photos, or "Improvements Applied" notes
- Do not invent employers, degrees, or metrics not supported by the source
- Date format: "Jan 2020 – Present" (never "till date" or "ongoing")

Apply these coaching notes (do not paste them into the resume):
${JSON.stringify(
    (analysis.suggestions || []).slice(0, 8).map((s) => ({ title: s.title, detail: s.detail })),
    null,
    2,
  )}

Return ONLY Markdown, no code fences.

Original:
"""
${cleaned.slice(0, 12000)}
"""`;

  const text = await llmGenerate(prompt, { temperature: 0.35, maxTokens: 4096 });
  if (!text) {
    // G4 fix: offline improve gives a base ATS resume (not the same as tailor fallback)
    const base = analysis.improvedMarkdown || buildImprovedMarkdown(cleaned, analysis);
    return base;
  }
  let md = text.replace(/^```markdown\n?|```$/g, "").trim();
  md = md.replace(/\n## Improvements Applied[\s\S]*$/i, "").trim();
  // Fix any remaining letter-spaced heading
  md = md.replace(/^#\s+(.+)$/m, (_, name) => `# ${normalizeExtractedText(name).replace(/\s+/g, " ")}`);
  if (md.length < 180 || /improvements applied/i.test(md)) {
    return analysis.improvedMarkdown || buildImprovedMarkdown(cleaned, analysis);
  }
  return md;
}

export async function tailorResumeForJob(
  rawText: string,
  job: { title: string; company: string; description: string; requirements: string[] },
): Promise<{ markdown: string; coverLetter: string; notes: string; aiScore?: number }> {
  const cleaned = normalizeExtractedText(rawText);
  const analysis = await analyzeResumeText(cleaned);
  const base = analysis.improvedMarkdown || buildAtsResumeMarkdown(analysis.parsedData);

  // Clean ATS-shaped fallback — never append keyword dumps into the resume body
  const reqHints = (job.requirements || []).filter(Boolean).slice(0, 8);
  const fallbackMd = reorderSkillsForJob(base, reqHints, job.title);
  const fallbackCover = `Dear Hiring Manager,\n\nI am applying for the ${job.title} role at ${job.company}. My experience aligns with the core requirements in your posting. I would welcome a conversation about how I can contribute.\n\nSincerely`;

  const prompt = `Tailor this resume for the job into an ATS-friendly Markdown resume.

Hard rules:
- Same structure: H1 name, contact, Professional Summary, Skills, Experience, Education
- Do NOT invent employers, degrees, titles, metrics, or skills not supported by the source resume
- You may reorder skills and rephrase existing bullets to emphasize JD overlap
- Do NOT add a "Keywords emphasized" or notes section inside the resume
- Keep optimization commentary only in the JSON "notes" field

Return ONLY JSON:
{"markdown":"...","coverLetter":"short 3-5 sentence cover letter using only evidence from the resume","notes":"..."}

Job: ${job.title} @ ${job.company}
Description: ${job.description.slice(0, 3000)}
Requirements: ${job.requirements.join(", ")}

Resume:
"""
${cleaned.slice(0, 10000)}
"""`;

  const text = await llmGenerate(prompt, { temperature: 0.35, maxTokens: 4096 });
  if (!text) {
    const { scorecard } = buildAtsScorecard(fallbackMd, `${job.title} ${job.description}`);
    return {
      markdown: fallbackMd,
      coverLetter: fallbackCover,
      notes:
        "Offline template (set OPENAI_API_KEY + OPENAI_MODEL=gpt-4.1-mini or GEMINI_API_KEY for full AI tailor). Keywords kept out of resume body.",
      aiScore: scorecard.overall,
    };
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    const { scorecard } = buildAtsScorecard(fallbackMd, `${job.title} ${job.description}`);
    return {
      markdown: fallbackMd,
      coverLetter: fallbackCover,
      notes: "Parse failed; used clean ATS fallback.",
      aiScore: scorecard.overall,
    };
  }
  const parsed = JSON.parse(match[0]) as { markdown?: string; coverLetter?: string; notes?: string };
  let markdown = (parsed.markdown || fallbackMd)
    .replace(/\n## Improvements Applied[\s\S]*$/i, "")
    .replace(/\n## Keywords emphasized[\s\S]*$/i, "")
    .trim();
  if (markdown.length < 180 || /keywords emphasized/i.test(markdown)) {
    markdown = fallbackMd;
  }
  // Soft anti-invention: if LLM invents obvious new employers, fall back
  if (looksInventedEmployers(cleaned, markdown)) {
    markdown = fallbackMd;
  }
  const { scorecard } = buildAtsScorecard(markdown, `${job.title} ${job.description}`);
  return {
    markdown,
    coverLetter: parsed.coverLetter || fallbackCover,
    notes: parsed.notes || "Tailored for job.",
    aiScore: scorecard.overall,
  };
}

/** Prefer JD-overlapping skills first without inventing new ones. */
function reorderSkillsForJob(markdown: string, reqHints: string[], jobTitle: string): string {
  if (!reqHints.length) return markdown;
  const skillsMatch = markdown.match(/(##\s*Skills\s*\n)([\s\S]*?)(?=\n##\s|\n#\s|$)/i);
  if (!skillsMatch) return markdown;
  const existing = skillsMatch[2]
    .split(/[,\n•|-]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!existing.length) return markdown;
  const lowerReq = reqHints.map((r) => r.toLowerCase());
  const scored = existing.map((skill) => {
    const s = skill.toLowerCase();
    const hit = lowerReq.some((r) => s.includes(r) || r.includes(s));
    return { skill, hit };
  });
  scored.sort((a, b) => Number(b.hit) - Number(a.hit));
  const nextSkills = scored.map((s) => s.skill).join(", ");
  const summaryBoost = reqHints.slice(0, 3).join(", ");
  let out = markdown.replace(skillsMatch[0], `${skillsMatch[1]}${nextSkills}\n\n`);
  // Light summary nudge without inventing employers
  out = out.replace(
    /(##\s*Professional Summary\s*\n)([\s\S]*?)(?=\n##\s)/i,
    (full, h: string, body: string) => {
      const trimmed = body.trim();
      if (/targeting|aligned to/i.test(trimmed)) return full;
      return `${h}${trimmed} Targeting ${jobTitle}${summaryBoost ? ` with emphasis on ${summaryBoost}` : ""}.\n\n`;
    },
  );
  return out;
}

function looksInventedEmployers(source: string, markdown: string): boolean {
  const src = source.toLowerCase();
  const companies = [...markdown.matchAll(/###\s+[—\-].*?—\s*([^\n]+)/g)].map((m) =>
    m[1].trim().toLowerCase(),
  );
  // Also ### Role — Company pattern
  const more = [...markdown.matchAll(/###\s+[^—\n]+—\s*([^\n]+)/g)].map((m) =>
    m[1].trim().toLowerCase(),
  );
  const all = [...new Set([...companies, ...more])].filter((c) => c.length > 2);
  if (!all.length) return false;
  let missing = 0;
  for (const c of all.slice(0, 6)) {
    const token = c.split(/[^a-z0-9]+/).find((t) => t.length > 3);
    if (token && !src.includes(token)) missing += 1;
  }
  return missing >= 2;
}
