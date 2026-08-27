/**
 * Locked CareerOS product stance (co-founder, Aug 2026).
 * Do not market the opposite without an explicit product decision.
 *
 * Naming: we ship as **CareerOS** (hosted assisted Career OS for India manufacturing).
 * We do NOT brand as "career-ops" / CareerOps — that is a separate open-source CLI
 * (santifer/career-ops). We reuse proven patterns (portal feeds, A–F filter, human submit)
 * under our own product name.
 */
export const PRODUCT_STANCE = {
  /** Public product name — never rename to career-ops. */
  brandName: "CareerOS",
  brandTagline: "Assisted Career OS for India manufacturing",
  /** Max discovery runs per calendar day (UTC date key). */
  dailyDigestRunsMax: 3,
  /** Max assisted-apply seats in the review queue per day (confirmed applies, not silent bots). */
  dailyQueueCap: 15,
  /** Soft target new matches per digest run (also capped by remaining seats). */
  perDigestTarget: 4,
  /** Never silent LinkedIn/Naukri Easy Apply. */
  assistedApplyOnly: true,
  /** Never promise whole-internet crawl. */
  fullWebScrape: false,
  /** Official ATS board APIs first; TinyFish web search is backup. */
  portalScanFirst: true,
  /**
   * Candidate buy-bar (co-founder / would-I-pay test).
   * Ship only what passes this — otherwise we are not ready to charge.
   */
  candidateBuyBar: {
    currency: "INR",
    /** What a mid-senior India manufacturing candidate should pay when value is real. */
    conciergeInrMonthly: 1999,
    proInrMonthlyTarget: 999,
    /** Paid pilot window before Concierge is considered earned. */
    pilotDays: 14,
    /** Minimum India-fit seats in pilot window to keep charging. */
    pilotMinSeats: 5,
    /** Minimum tailored packets in pilot window. */
    pilotMinPackets: 3,
    refundPromise:
      "14-day Concierge pilot: if you get fewer than 5 India-fit seats or 0 packets after setting Profile + Resume, we refund / extend — no debate.",
    mustHave: [
      "Jobs match my profile role family, cities, CTC, notice — not US tech spam",
      "Official OEM / ATS sources (Workday + Greenhouse + careers) with why-match + gaps",
      "Packet ready to upload (print-PDF / Markdown) without inventing facts",
      "I always submit — never silent LinkedIn/Naukri Easy Apply",
      "Empty search days do not burn my daily credit; paste / alert still works",
      "I can log interviews so CareerOS proves conversion, not vanity queue counts",
      "Dashboard tells me the next hunt action and overdue follow-ups — not a blank KPI wall",
    ],
  },
  /** Honest ATS wording for UI / sales. */
  atsLabel: "ATS-style readiness",
  atsDisclaimer:
    "Score uses CareerOS rules + optional LLM. Not connected to Workday, Naukri, or LinkedIn employer ATS.",
  pricingGate: {
    starterOk: "Builder + ATS-style scorecard + Markdown / print-PDF packet",
    proRequires: "3×/day digests (portal + live) + pasted / alert JDs + auto-prepare packets",
    premiumRequires: "Official portal ingest + measured interview rate — not whole-web scrape",
    conciergeOk: "Human reviews daily pack; candidate confirms apply",
  },
} as const;

export type DigestSlot = "morning" | "midday" | "evening";

export function digestSlotForRunIndex(indexZeroBased: number): DigestSlot {
  if (indexZeroBased <= 0) return "morning";
  if (indexZeroBased === 1) return "midday";
  return "evening";
}

export function digestSlotLabel(slot: DigestSlot): string {
  if (slot === "morning") return "Morning search";
  if (slot === "midday") return "Midday search";
  return "Evening search";
}
