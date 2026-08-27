import type { CareerTargets } from "@/lib/db/types";

export const DEFAULT_INDUSTRY_PACK = "manufacturing_scm" as const;

export const INDUSTRY_PACKS = [
  { id: "manufacturing_scm", label: "Manufacturing — Purchase / SCM / Plant" },
  { id: "healthcare", label: "Healthcare — Clinical / Hospital / Med Affairs" },
  { id: "general", label: "General professional" },
] as const;

export type RoleFamily = "sales" | "procurement" | "plant_ops" | "healthcare" | "general";

export function emptyTargets(): CareerTargets {
  return {
    targetRole: "",
    yearsExperience: 0,
    cities: [],
    industryPack: DEFAULT_INDUSTRY_PACK,
    /** Default true — Pan-India hunt; cities are preference, not a wall */
    openToRelocate: true,
  };
}

export function normalizeTargets(raw: Partial<CareerTargets> | null | undefined): CareerTargets {
  const base = emptyTargets();
  if (!raw) return base;
  const cities = Array.isArray(raw.cities)
    ? raw.cities.map((c) => String(c).trim()).filter(Boolean).slice(0, 8)
    : String((raw as { cities?: unknown }).cities || "")
        .split(/[,|]/)
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 8);
  return {
    targetRole: String(raw.targetRole || "").slice(0, 120),
    yearsExperience: Math.max(0, Math.min(45, Number(raw.yearsExperience) || 0)),
    cities,
    ctcMinLpa: raw.ctcMinLpa != null ? Number(raw.ctcMinLpa) || undefined : undefined,
    ctcMaxLpa: raw.ctcMaxLpa != null ? Number(raw.ctcMaxLpa) || undefined : undefined,
    noticeDays: raw.noticeDays != null ? Math.max(0, Number(raw.noticeDays) || 0) : undefined,
    industryPack:
      raw.industryPack === "healthcare" || raw.industryPack === "general"
        ? raw.industryPack
        : DEFAULT_INDUSTRY_PACK,
    openToRelocate: raw.openToRelocate === undefined ? true : Boolean(raw.openToRelocate),
  };
}

/** Infer family from free text (role title, job title+description). */
export function inferRoleFamilyFromText(text: string): RoleFamily {
  const role = (text || "").toLowerCase();
  if (
    /sales|account manager|key account|kam\b|rsm\b|bdm\b|business development|channel|dealer|distributor|institutional|commercial manager|area sales|territory|revenue/.test(
      role,
    )
  ) {
    return "sales";
  }
  if (
    /production|plant|maintenance|quality|manufacturing engineer|shift incharge|operations manager|factory|ehs|tpm|lean/.test(
      role,
    )
  ) {
    return "plant_ops";
  }
  if (
    /clinical|hospital|medical|physician|doctor|nurse|healthcare|patient/.test(role)
  ) {
    return "healthcare";
  }
  if (
    /procure|purchase|scm|supply chain|sourcing|vendor|material|buyer|planning|logistics|category manager|stores|inventory/.test(
      role,
    )
  ) {
    return "procurement";
  }
  return "general";
}

/** Infer hunt family from target role text (drives search keywords + match lexicon). */
export function inferRoleFamily(targets: CareerTargets | null | undefined): RoleFamily {
  if (!targets) return "procurement";
  if (targets.industryPack === "healthcare") return "healthcare";
  if (targets.industryPack === "general") return "general";

  const fromRole = inferRoleFamilyFromText(targets.targetRole || "");
  if (fromRole !== "general") return fromRole;
  // Manufacturing pack with empty/unknown role → default beachhead (purchase/SCM)
  if (!(targets.targetRole || "").trim()) return "procurement";
  return "general";
}

/** True when candidate family and job family are compatible for queue admission. */
export function roleFamiliesCompatible(
  candidate: RoleFamily,
  job: RoleFamily,
): boolean {
  if (candidate === "general" || job === "general") return true;
  return candidate === job;
}

/** Keywords for TinyFish queries + match rubric — follows Profile targetRole. */
export function packKeywordsForTargets(targets: CareerTargets | null | undefined): string {
  const family = inferRoleFamily(targets);
  switch (family) {
    case "sales":
      return "sales key account channel distributor institutional B2B manufacturing commercial revenue";
    case "plant_ops":
      return "production plant quality maintenance manufacturing operations lean TPM safety";
    case "healthcare":
      return "clinical hospital medical doctor physician healthcare patient care";
    case "procurement":
      return "procurement purchase SAP MM supply chain vendor negotiation manufacturing plant sourcing";
    default:
      return "manufacturing India careers jobs";
  }
}

export function targetsToSearchText(targets: CareerTargets | null | undefined): string {
  if (!targets) return "";
  const parts = [
    targets.targetRole,
    targets.yearsExperience ? `${targets.yearsExperience} years experience` : "",
    ...(targets.cities || []),
    packKeywordsForTargets(targets),
    targets.ctcMinLpa ? `CTC ${targets.ctcMinLpa} LPA` : "",
    targets.ctcMaxLpa ? `${targets.ctcMaxLpa} LPA` : "",
    targets.noticeDays != null ? `notice ${targets.noticeDays} days` : "",
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function hasUsableTargets(targets: CareerTargets | null | undefined): boolean {
  if (!targets) return false;
  return (
    Boolean(targets.targetRole?.trim()) ||
    (targets.cities?.length || 0) > 0 ||
    (targets.yearsExperience || 0) > 0
  );
}

/** Soft preference only — never used to drop jobs from the national pool when relocating. */
export function locationPreferenceScore(
  jobLocation: string,
  targets: CareerTargets | null | undefined,
): { score: number; note?: string } {
  if (!targets?.cities?.length) {
    return { score: 70, note: jobLocation ? `Posted: ${jobLocation}` : undefined };
  }
  const loc = (jobLocation || "").toLowerCase();
  const cityHit = targets.cities.some((c) => loc.includes(c.toLowerCase()));
  const panIndia = /remote|pan[\s-]?india|anywhere|india\b|multiple|pan india/i.test(loc);

  if (cityHit) {
    return { score: 98, note: `Preferred city match: ${jobLocation}` };
  }
  if (panIndia) {
    return { score: 82, note: `Pan-India / flexible location: ${jobLocation}` };
  }
  return {
    score: targets.openToRelocate === false ? 28 : 62,
    note:
      targets.openToRelocate === false
        ? `Outside preferred cities (${jobLocation}) — excluded when relocate is off`
        : `Other city (${jobLocation}) — still ranked; prefer ${targets.cities.join(", ")} if equal fit`,
  };
}

/**
 * Hard location gate only when openToRelocate === false and cities are set.
 * Pan-India / remote always allowed.
 */
export function jobMatchesTargetLocation(
  jobLocation: string,
  targets: CareerTargets | null | undefined,
): boolean {
  if (!targets?.cities?.length) return true;
  if (targets.openToRelocate !== false) return true;
  const loc = (jobLocation || "").toLowerCase();
  if (!loc.trim()) return true;
  if (/remote|pan[\s-]?india|anywhere|multiple/i.test(loc)) return true;
  return targets.cities.some((c) => loc.includes(c.toLowerCase()));
}
