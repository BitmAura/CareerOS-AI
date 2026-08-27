import type { CareerTargets, JobRecord } from "@/lib/db/types";
import { freshnessDays } from "@/lib/jobs/job-signals";
import {
  inferRoleFamily,
  inferRoleFamilyFromText,
  locationPreferenceScore,
  packKeywordsForTargets,
  roleFamiliesCompatible,
  targetsToSearchText,
} from "@/lib/product/targets";

/** career-ops style: letter grade + reasons so candidates know why to apply */
export type MatchRubric = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  stars: number;
  why: string[];
  gaps: string[];
  action: string;
  unknowns?: string[];
};

const MANUFACTURING_PROCUREMENT = [
  "procurement",
  "purchase",
  "sap",
  "supply",
  "chain",
  "logistics",
  "otif",
  "vendor",
  "negotiation",
  "inventory",
  "sourcing",
];

const MANUFACTURING_SALES = [
  "sales",
  "account",
  "channel",
  "distributor",
  "dealer",
  "institutional",
  "revenue",
  "commercial",
  "b2b",
  "territory",
  "customer",
];

const MANUFACTURING_PLANT = [
  "production",
  "plant",
  "quality",
  "maintenance",
  "lean",
  "tpm",
  "manufacturing",
  "operations",
  "safety",
  "factory",
];

const HEALTHCARE = [
  "clinical",
  "hospital",
  "medical",
  "doctor",
  "physician",
  "nurse",
  "patient",
  "healthcare",
  "surgery",
  "consultant",
];

/** Skip tiny tokens that cause false positives (mm, sap alone ok if length>2 but "key" is bad). */
const STOP_TOKENS = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "our",
  "your",
  "job",
  "role",
  "india",
  "team",
  "work",
  "key",
  "plus",
  "years",
  "year",
  "manager",
  "senior",
]);

function tokensFrom(...parts: string[]): string[] {
  const set = new Set<string>();
  for (const p of parts) {
    for (const t of p.toLowerCase().split(/[^a-z0-9+]+/)) {
      if (t.length > 2 && !STOP_TOKENS.has(t)) set.add(t);
    }
  }
  return [...set];
}

function gradeFromScore(score: number): MatchRubric["grade"] {
  if (score >= 85) return "A";
  if (score >= 72) return "B";
  if (score >= 58) return "C";
  if (score >= 45) return "D";
  return "F";
}

function starsFromScore(score: number): number {
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

function domainLexicon(targets: CareerTargets | null | undefined) {
  const family = inferRoleFamily(targets);
  if (family === "healthcare") return HEALTHCARE;
  if (family === "sales") return [...MANUFACTURING_SALES, "manufacturing"];
  if (family === "plant_ops") return MANUFACTURING_PLANT;
  if (family === "procurement") return [...MANUFACTURING_PROCUREMENT, "plant", "manufacturing"];
  return [...MANUFACTURING_PROCUREMENT, ...MANUFACTURING_SALES, ...MANUFACTURING_PLANT].slice(0, 24);
}

export function evaluateJobMatch(
  job: JobRecord,
  profileText: string,
  targets?: CareerTargets | null,
): MatchRubric {
  const targetText = targetsToSearchText(targets);
  const hay = `${profileText || ""} ${targetText}`.toLowerCase();
  const reqTokens = tokensFrom(...(job.requirements || []));
  const jobTokens = tokensFrom(job.title, job.description, ...(job.requirements || [])).slice(0, 50);
  const why: string[] = [];
  const gaps: string[] = [];
  const unknowns: string[] = [];
  const family = inferRoleFamily(targets);
  const jobFamily =
    job.roleFamily || inferRoleFamilyFromText(`${job.title} ${job.description}`);

  let skillHits = 0;
  const skillMatched: string[] = [];
  for (const t of reqTokens.length ? reqTokens : jobTokens.slice(0, 12)) {
    if (hay.includes(t)) {
      skillHits += 1;
      if (skillMatched.length < 6) skillMatched.push(t);
    } else if (gaps.length < 8 && t.length > 3) {
      gaps.push(`Missing keyword: ${t}`);
    }
  }
  const denom = Math.max(1, reqTokens.length || Math.min(12, jobTokens.length));
  const skillScore = (skillHits / denom) * 100;

  const lexicon = domainLexicon(targets);
  const domainJob = lexicon.filter((k) =>
    `${job.title} ${job.description}`.toLowerCase().includes(k),
  );
  const domainProfile = lexicon.filter((k) => hay.includes(k));
  const domainOverlap = domainJob.filter((k) => domainProfile.includes(k));
  let domainScore = domainJob.length
    ? (domainOverlap.length / domainJob.length) * 100
    : domainProfile.length >= 3
      ? 70
      : 50;

  if (!roleFamiliesCompatible(family, jobFamily)) {
    domainScore = Math.min(domainScore, 28);
    gaps.push(`Role family mismatch: job looks ${jobFamily}, you hunt ${family}`);
  } else if (family === jobFamily) {
    why.push(`Role family fit: ${family}`);
    domainScore = Math.max(domainScore, 72);
  }

  const titleBits = tokensFrom(job.title);
  const titleHits = titleBits.filter((t) => hay.includes(t)).length;
  let titleScore = titleBits.length ? (titleHits / titleBits.length) * 100 : 50;

  if (targets?.targetRole?.trim()) {
    const roleBits = tokensFrom(targets.targetRole);
    const roleHits = roleBits.filter((t) =>
      `${job.title} ${job.description}`.toLowerCase().includes(t),
    ).length;
    const roleScore = roleBits.length ? (roleHits / roleBits.length) * 100 : 50;
    titleScore = titleScore * 0.35 + roleScore * 0.65;
    if (roleHits > 0) why.push(`Matches your target role: ${targets.targetRole}`);
    else gaps.push(`Target role weak match: ${targets.targetRole}`);
  }

  const locPref = locationPreferenceScore(job.location, targets);
  const locationScore = locPref.score;
  if (locPref.note) why.push(locPref.note);

  let yearsScore = 70;
  if (targets?.yearsExperience && targets.yearsExperience > 0) {
    const reqYears = `${job.title} ${job.description} ${(job.requirements || []).join(" ")}`.match(
      /(\d+)\+?\s*(?:\+|plus)?\s*years?/i,
    );
    if (reqYears) {
      const need = Number(reqYears[1]);
      if (targets.yearsExperience >= need) {
        yearsScore = 95;
        why.push(`Experience fit: ${targets.yearsExperience} yrs vs ${need}+ required`);
      } else if (targets.yearsExperience >= need - 2) {
        yearsScore = 65;
        gaps.push(`Years: JD wants ${need}+`);
      } else {
        yearsScore = 35;
        gaps.push(`Years: JD wants ${need}+`);
      }
    } else {
      unknowns.push("Years required not stated in JD");
    }
  }

  let ctcScore = 70;
  if (targets?.ctcMinLpa || targets?.ctcMaxLpa) {
    const minKnown = job.salaryLpaMin;
    const maxKnown = job.salaryLpaMax;
    const blob = `${job.salary || ""} ${job.description}`;
    const lpa = blob.match(/(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(?:\d+(?:\.\d+)?)?\s*lpa/i);
    const low = minKnown ?? (lpa ? Number(lpa[1]) : undefined);
    if (low != null) {
      const min = targets.ctcMinLpa || 0;
      const max = targets.ctcMaxLpa || 999;
      const high = maxKnown ?? low;
      if (high >= min && low <= max) {
        ctcScore = 95;
        why.push(`CTC band (~${low}${high !== low ? `-${high}` : ""} LPA) fits your range`);
      } else {
        ctcScore = 40;
        gaps.push(`CTC outside your ${min}-${max} LPA band`);
      }
    } else {
      unknowns.push("CTC not listed");
      ctcScore = 70;
    }
  }

  let noticeScore = 70;
  if (targets?.noticeDays != null) {
    const jobNotice = job.noticeDays;
    if (jobNotice != null) {
      if (targets.noticeDays <= jobNotice + 15) {
        noticeScore = 92;
        why.push(`Notice OK: you ${targets.noticeDays}d vs JD ${jobNotice}d`);
      } else {
        noticeScore = 42;
        gaps.push(`Notice: JD wants ~${jobNotice}d, you have ${targets.noticeDays}d`);
      }
    } else {
      unknowns.push("Notice period not listed");
    }
  }

  let freshnessScore = 70;
  const age = freshnessDays(job.postedAt);
  if (age != null) {
    if (age <= 14) {
      freshnessScore = 95;
      why.push(`Fresh posting (${age}d old)`);
    } else if (age <= 45) {
      freshnessScore = 75;
      why.push(`Posted ${age}d ago`);
    } else if (age <= 90) {
      freshnessScore = 55;
      gaps.push(`Stale posting (${age}d old)`);
    } else {
      freshnessScore = 30;
      gaps.push(`Very old posting (${age}d)`);
    }
  } else {
    unknowns.push("Post date unknown");
  }

  if (job.sourceKind === "live" || job.source === "tinyfish_live") {
    why.push("Live public careers find");
  } else if (job.sourceKind === "beachhead" || job.source === "beachhead") {
    why.push("Curated manufacturing seed (verify on careers site)");
  } else if (job.sourceKind === "paste") {
    why.push("From your pasted JD / URL");
  }

  const score = Math.round(
    Math.min(
      99,
      Math.max(
        18,
        skillScore * 0.26 +
          domainScore * 0.18 +
          titleScore * 0.24 +
          locationScore * 0.1 +
          yearsScore * 0.07 +
          ctcScore * 0.07 +
          noticeScore * 0.04 +
          freshnessScore * 0.04,
      ),
    ),
  );
  const grade = gradeFromScore(score);

  if (skillMatched.length) why.push(`Skills overlap: ${skillMatched.join(", ")}`);
  if (domainOverlap.length) {
    why.push(`Domain fit (${family}): ${domainOverlap.slice(0, 5).join(", ")}`);
  } else if (targets?.targetRole) {
    why.push(
      `Hunting as ${targets.targetRole} · pack: ${packKeywordsForTargets(targets).split(" ").slice(0, 4).join(", ")}`,
    );
  }
  if (!why.length) why.push("Partial overlap — review JD before applying");

  const uniqueGaps = [...new Set(gaps)].slice(0, 6);
  let action = "Prepare packet and open careers if JD fits your target role.";
  if (grade === "A" || grade === "B") {
    action = "Strong fit — prioritize packet + Confirm submit today.";
  } else if (grade === "C") {
    action = "Decent fit — tailor resume to gaps, then open careers.";
  } else {
    action = "Weak fit — only apply if pivoting; otherwise Dismiss.";
  }
  if (uniqueGaps.length) {
    action += ` Emphasize: ${uniqueGaps.slice(0, 3).join("; ")}.`;
  }

  return {
    score,
    grade,
    stars: starsFromScore(score),
    why: [...new Set(why)].slice(0, 8),
    gaps: uniqueGaps,
    action,
    unknowns: unknowns.length ? [...new Set(unknowns)].slice(0, 4) : undefined,
  };
}

export function seniorityClash(jobTitle: string, targets?: CareerTargets | null): boolean {
  const want = `${targets?.targetRole || ""}`.toLowerCase();
  const title = jobTitle.toLowerCase();
  const juniorWant =
    /get|trainee|intern|fresher|graduate engineer|campus/.test(want) ||
    (targets?.yearsExperience != null && targets.yearsExperience <= 1);
  const seniorJob = /\b(manager|director|head|lead|principal|vp|chief)\b/.test(title);
  return juniorWant && seniorJob;
}

/** Hard admission check before seating a job in digest. */
export function passesAdmissionFloor(
  rubric: MatchRubric,
  job: JobRecord,
  targets?: CareerTargets | null,
  floor = 58,
): boolean {
  if (rubric.score < floor) return false;
  if (seniorityClash(job.title, targets)) return false;
  const family = inferRoleFamily(targets);
  const jobFamily =
    job.roleFamily || inferRoleFamilyFromText(`${job.title} ${job.description}`);
  if (!roleFamiliesCompatible(family, jobFamily)) return false;
  return true;
}
