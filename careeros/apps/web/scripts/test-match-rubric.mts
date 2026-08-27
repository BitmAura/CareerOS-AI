import { evaluateJobMatch } from "../src/lib/jobs/match-rubric";
import { rankJobsForDigest } from "../src/lib/jobs/digest";
import { BEACHHEAD } from "../src/lib/db/local-store";
import type { CareerTargets, JobRecord } from "../src/lib/db/types";

const targets: CareerTargets = {
  targetRole: "Senior Procurement Manager",
  yearsExperience: 8,
  cities: ["Mumbai", "Pune"],
  industryPack: "manufacturing_scm",
  openToRelocate: true,
};

const jobs: JobRecord[] = BEACHHEAD.map((j, i) => ({
  ...j,
  id: `j${i}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const ranked = rankJobsForDigest(jobs, "sap mm negotiation vendor", new Set(), 8, targets);
console.log("=== Pan-India + city preference ===");
for (const r of ranked) {
  console.log(`${r.rubric.grade} ${r.matchScore}% | ${r.job.title} @ ${r.job.location}`);
}

const offCity = jobs.find((j) => !/mumbai|pune/i.test(j.location));
if (!offCity) {
  console.error("FAIL need off-city seed");
  process.exit(1);
}
const inPool = rankJobsForDigest(jobs, "sap mm negotiation vendor", new Set(), 50, targets).some(
  (r) => r.job.id === offCity.id,
);
console.log("off-city still in national pool:", inPool ? "OK" : "FAIL");
if (!inPool) process.exit(1);

const mumbaiJob = jobs.find((j) => /mumbai/i.test(j.location))!;
const mumbai = evaluateJobMatch(mumbaiJob, "sap mm negotiation vendor", targets);
const other = evaluateJobMatch(offCity, "sap mm negotiation vendor", targets);
console.log(`boost check: Mumbai ${mumbai.score} vs ${offCity.location} ${other.score}`);
console.log("PASS");
