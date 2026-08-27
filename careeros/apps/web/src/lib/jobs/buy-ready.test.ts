import { describe, expect, it } from "vitest";
import { isJobDetailUrl } from "@/lib/jobs/extract-job-url";
import { isUsablePublicJobUrl, buildDigestSearchQueries } from "@/lib/jobs/live-discover";
import { evaluateJobMatch, passesAdmissionFloor } from "@/lib/jobs/match-rubric";
import { digestLimitForRun, remainingQueueSeats, rankJobsForDigest } from "@/lib/jobs/digest";
import { parseNoticeDays, parseSalaryLpa, freshnessDays } from "@/lib/jobs/job-signals";
import { encodeQueueNotes, mergeQueueNotes, parseQueueNotes } from "@/lib/jobs/queue-notes";
import {
  inferRoleFamily,
  jobMatchesTargetLocation,
  roleFamiliesCompatible,
} from "@/lib/product/targets";
import type { JobRecord } from "@/lib/db/types";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import {
  attributeJobSource,
  manufacturingSourceSearchClauses,
} from "@/lib/jobs/job-sources";

function job(partial: Partial<JobRecord> & Pick<JobRecord, "title" | "company">): JobRecord {
  const now = new Date().toISOString();
  return {
    id: partial.id || "j1",
    location: partial.location || "Pune",
    description: partial.description || "Role description",
    requirements: partial.requirements || [],
    source: partial.source || "beachhead",
    sourceKind: partial.sourceKind,
    roleFamily: partial.roleFamily,
    salary: partial.salary,
    salaryLpaMin: partial.salaryLpaMin,
    salaryLpaMax: partial.salaryLpaMax,
    noticeDays: partial.noticeDays,
    postedAt: partial.postedAt,
    sourceUrl: partial.sourceUrl,
    matchScore: partial.matchScore,
    isActive: partial.isActive ?? true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("URL detail gating", () => {
  it("rejects careers homepages", () => {
    expect(isJobDetailUrl("https://www.tatasteel.com/careers/")).toBe(false);
    expect(isJobDetailUrl("https://www.bosch.in/careers/")).toBe(false);
    expect(isUsablePublicJobUrl("https://www.tatasteel.com/careers/")).toBe(false);
  });

  it("accepts ATS job-detail URLs", () => {
    expect(
      isJobDetailUrl("https://boards.greenhouse.io/acme/jobs/1234567"),
    ).toBe(true);
    expect(
      isUsablePublicJobUrl("https://boards.greenhouse.io/acme/jobs/1234567"),
    ).toBe(true);
    expect(
      isJobDetailUrl("https://jobs.lever.co/acme/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
    ).toBe(true);
    expect(isJobDetailUrl("https://careers.se.com/jobs/103006?lang=en-us")).toBe(true);
    expect(
      isJobDetailUrl(
        "https://jobs.siemens.com/en_US/externaljobs/JobDetail/Plant-Manager/12345",
      ),
    ).toBe(true);
    expect(
      isUsablePublicJobUrl(
        "https://careers.bhel.in/et_st_2025/detailed-recruitment-advertisement.pdf",
      ),
    ).toBe(true);
  });

  it("blocks LinkedIn/Naukri", () => {
    expect(isUsablePublicJobUrl("https://www.linkedin.com/jobs/view/123")).toBe(false);
    expect(isUsablePublicJobUrl("https://www.naukri.com/job-listings-xyz")).toBe(false);
  });
});

describe("profile-driven queries", () => {
  it("builds sales queries without Procurement Manager default", () => {
    const q = buildDigestSearchQueries({
      targetRole: "Regional Sales Manager",
      yearsExperience: 8,
      cities: ["Pune", "Mumbai"],
      industryPack: "manufacturing_scm",
      openToRelocate: true,
      ctcMinLpa: 20,
      ctcMaxLpa: 30,
      noticeDays: 60,
    });
    expect(q.join(" ")).toMatch(/Regional Sales Manager/);
    expect(q.join(" ")).not.toMatch(/Procurement Manager/);
    expect(inferRoleFamily({
      targetRole: "Regional Sales Manager",
      yearsExperience: 8,
      cities: ["Pune"],
      industryPack: "manufacturing_scm",
    })).toBe("sales");
    expect(q.join(" ")).toMatch(/jobs\.siemens\.com|careers\.se\.com/);
  });
});

describe("manufacturing source attribution", () => {
  it("labels verified company and PSU sources", () => {
    const company = attributeJobSource(
      "https://careers.se.com/jobs/103006",
      "Schneider Electric",
    );
    expect(company.official).toBe(true);
    expect(company.label).toMatch(/Schneider/i);

    const psu = attributeJobSource(
      "https://careers.bhel.in/et_st_2025/recruitment.pdf",
    );
    expect(psu.type).toBe("psu_notice");
    expect(psu.official).toBe(true);
  });

  it("targets official enterprise ATS and PSU cohorts", () => {
    expect(manufacturingSourceSearchClauses("sales").join(" ")).toMatch(
      /careers\.abb|myworkdayjobs/,
    );
    expect(manufacturingSourceSearchClauses("plant_ops").join(" ")).toMatch(
      /careers\.bhel\.in|sailcareers/,
    );
  });
});

describe("location + family admission", () => {
  it("hard-filters location when relocate is off", () => {
    const targets = {
      targetRole: "Sales Manager",
      yearsExperience: 5,
      cities: ["Pune"],
      industryPack: "manufacturing_scm" as const,
      openToRelocate: false,
    };
    expect(jobMatchesTargetLocation("Pune", targets)).toBe(true);
    expect(jobMatchesTargetLocation("Chennai", targets)).toBe(false);
    expect(jobMatchesTargetLocation("Pan-India", targets)).toBe(true);
  });

  it("rejects wrong-family beachhead fill for sales", () => {
    const targets = {
      targetRole: "Regional Sales Manager",
      yearsExperience: 8,
      cities: ["Pune"],
      industryPack: "manufacturing_scm" as const,
      openToRelocate: true,
    };
    const procurement = job({
      title: "Senior Procurement Manager",
      company: "Tata",
      description: "SAP MM vendor negotiation procurement purchase sourcing",
      roleFamily: "procurement",
      requirements: ["Procurement", "SAP MM", "8+ years"],
    });
    const sales = job({
      title: "Regional Sales Manager — Industrial",
      company: "Schaeffler",
      description: "B2B sales channel key account distributor revenue manufacturing",
      roleFamily: "sales",
      requirements: ["Sales", "Key Account", "8+ years"],
      location: "Pune",
    });
    const ranked = rankJobsForDigest(
      [procurement, sales],
      "sales key account channel",
      new Set(),
      4,
      targets,
    );
    expect(ranked.every((r) => r.job.roleFamily === "sales")).toBe(true);
    expect(ranked.some((r) => r.job.title.includes("Sales"))).toBe(true);
  });

  it("roleFamiliesCompatible works", () => {
    expect(roleFamiliesCompatible("sales", "procurement")).toBe(false);
    expect(roleFamiliesCompatible("sales", "sales")).toBe(true);
    expect(roleFamiliesCompatible("general", "sales")).toBe(true);
  });
});

describe("CTC / notice / freshness scoring", () => {
  it("parses salary and notice signals", () => {
    expect(parseSalaryLpa("CTC 18-25 LPA").salaryLpaMin).toBe(18);
    expect(parseNoticeDays("Notice period 60 days")).toBe(60);
    expect(freshnessDays(new Date().toISOString().slice(0, 10))).toBe(0);
  });

  it("scores CTC and notice when known", () => {
    const targets = {
      targetRole: "Purchase Manager",
      yearsExperience: 8,
      cities: ["Mumbai"],
      industryPack: "manufacturing_scm" as const,
      ctcMinLpa: 20,
      ctcMaxLpa: 30,
      noticeDays: 60,
    };
    const fit = evaluateJobMatch(
      job({
        title: "Purchase Manager",
        company: "Acme",
        description: "Procurement purchase vendor negotiation manufacturing plant. Notice period 90 days.",
        salary: "22-28 LPA",
        salaryLpaMin: 22,
        salaryLpaMax: 28,
        noticeDays: 90,
        postedAt: new Date().toISOString().slice(0, 10),
        roleFamily: "procurement",
        requirements: ["Procurement", "Negotiation", "8+ years"],
      }),
      "procurement purchase sap negotiation 8 years mumbai",
      targets,
    );
    expect(fit.why.some((w) => /CTC|Notice|Fresh/i.test(w))).toBe(true);
    expect(passesAdmissionFloor(fit, job({
      title: "Purchase Manager",
      company: "Acme",
      roleFamily: "procurement",
      description: "procurement",
    }), targets)).toBe(true);
  });
});

describe("queue notes preserve rubric", () => {
  it("merges tailor notes without dropping rubric", () => {
    const rubric = {
      score: 80,
      grade: "B" as const,
      stars: 4,
      why: ["Role family fit"],
      gaps: [],
      action: "Prepare packet",
    };
    const encoded = encodeQueueNotes({ rubric, action: rubric.action });
    const merged = mergeQueueNotes(encoded, { tailorNotes: "Emphasized sales keywords" });
    const parsed = parseQueueNotes(merged);
    expect(parsed.rubric?.grade).toBe("B");
    expect(parsed.tailorNotes).toMatch(/sales/i);
  });

  it("reads legacy rubric-only JSON", () => {
    const legacy = JSON.stringify({
      score: 70,
      grade: "C",
      stars: 4,
      why: ["x"],
      gaps: [],
      action: "go",
    });
    expect(parseQueueNotes(legacy).rubric?.grade).toBe("C");
  });
});

describe("seat caps", () => {
  it("enforces daily queue cap math", () => {
    expect(remainingQueueSeats(0)).toBe(PRODUCT_STANCE.dailyQueueCap);
    expect(remainingQueueSeats(PRODUCT_STANCE.dailyQueueCap)).toBe(0);
    expect(digestLimitForRun(14)).toBe(1);
    expect(digestLimitForRun(15)).toBe(0);
  });
});
