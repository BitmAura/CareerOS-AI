/**
 * Shared location + keyword gates for portal / OEM scanners.
 */

import type { CareerTargets } from "@/lib/db/types";
import { packKeywordsForTargets } from "@/lib/product/targets";

export function indiaRelevantLocation(
  location: string,
  targets?: CareerTargets | null,
): boolean {
  const loc = (location || "").toLowerCase().trim();
  if (!loc) return false;

  const hasIndia =
    /\bindia\b|bengaluru|bangalore|mumbai|pune|chennai|hyderabad|delhi|gurgaon|gurugram|noida|kolkata|ahmedabad|coimbatore|vadodara|nashik|jaipur|ncr\b|andhra pradesh|karnataka|maharashtra|tamil nadu|telangana|gujarat/.test(
      loc,
    );
  if (
    !hasIndia &&
    /\b(united states|\busa\b|u\.s\.|california|texas|new york|seattle|london|\buk\b|mexico|china|germany|europe|remote\s*[-–]\s*usa)\b/i.test(
      loc,
    )
  ) {
    return false;
  }

  const cities = (targets?.cities || []).map((c) => c.toLowerCase());
  if (cities.some((c) => c && loc.includes(c))) return true;
  if (hasIndia) return true;

  if (
    targets?.openToRelocate &&
    /\b(apac|asia|remote)\b/i.test(loc) &&
    !/\b(usa|uk|europe)\b/i.test(loc)
  ) {
    return true;
  }
  return false;
}

export function profileKeywordHit(
  text: string,
  targets?: CareerTargets | null,
): boolean {
  const pack = packKeywordsForTargets(targets).toLowerCase();
  const role = (targets?.targetRole || "").toLowerCase();
  const hay = text.toLowerCase();
  const tokens = [...pack.split(/\s+/), ...role.split(/\s+/)].filter(
    (t) => t.length > 3 && !["with", "from", "india", "years"].includes(t),
  );
  if (!tokens.length) return true;
  const hits = tokens.filter((t) => hay.includes(t)).length;
  return hits >= Math.min(2, tokens.length);
}
