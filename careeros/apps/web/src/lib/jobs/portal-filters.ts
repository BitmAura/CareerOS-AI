/**
 * Shared location + keyword gates for portal / OEM scanners.
 */

import type { CareerTargets } from "@/lib/db/types";
import { packKeywordsForTargets } from "@/lib/product/targets";

const INDIA_LOC =
  /\bindia\b|bengaluru|bangalore|mumbai|pune|chennai|hyderabad|delhi|gurgaon|gurugram|noida|kolkata|ahmedabad|coimbatore|vadodara|nashik|jaipur|ncr\b|andhra pradesh|karnataka|maharashtra|tamil nadu|telangana|gujarat|uttar pradesh|madhya pradesh|rajasthan|kerala|odisha|west bengal|haryana|punjab/;

const NON_INDIA_LOC =
  /\b(united states|\busa\b|\bus\b|u\.s\.a?\b|canada|mexico|china|germany|europe|\buk\b|united kingdom|london|seattle|california|texas|new york|florida|illinois|massachusetts|washington|colorado|arizona|georgia|san francisco|los angeles|chicago|austin|boston|denver|atlanta|remote\s*[-–]\s*usa|remote\s*[-–]\s*us)\b|,\s*(ca|ny|tx|wa|il|ma|fl|co|az|ga|nj|nc|va|or|mi)\b/;

export function indiaRelevantLocation(
  location: string,
  targets?: CareerTargets | null,
): boolean {
  const loc = (location || "").toLowerCase().trim();
  if (!loc) return false;

  // Explicit non-India first (catches "San Francisco, CA")
  if (NON_INDIA_LOC.test(loc) && !INDIA_LOC.test(loc)) {
    return false;
  }

  const hasIndia = INDIA_LOC.test(loc);
  const cities = (targets?.cities || []).map((c) => c.toLowerCase().trim()).filter(Boolean);
  if (cities.some((c) => c && loc.includes(c))) {
    // Target city match still blocked if clearly US/EU
    if (NON_INDIA_LOC.test(loc) && !hasIndia) return false;
    return true;
  }
  if (hasIndia) return true;

  if (
    targets?.openToRelocate &&
    /\b(apac|asia|remote)\b/i.test(loc) &&
    !NON_INDIA_LOC.test(loc)
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
