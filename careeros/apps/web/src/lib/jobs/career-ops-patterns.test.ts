import { describe, expect, it } from "vitest";
import { ingestAlertOrPaste, extractJobUrlsFromAlertText } from "@/lib/jobs/alert-ingest";
import { assessPostingLegitimacy } from "@/lib/jobs/legitimacy";
import { boardsForRoleFamily } from "@/lib/jobs/portal-boards";
import { buildPacketHtml, buildSimpleTextPdf } from "@/lib/resume/packet-pdf";
import { detectKnockOuts, buildNegotiationScript } from "@/lib/career/win-kit";
import { PRODUCT_STANCE } from "@/lib/product/stance";

describe("CareerOS naming", () => {
  it("keeps CareerOS brand and never brands as career-ops", () => {
    expect(PRODUCT_STANCE.brandName).toBe("CareerOS");
    expect(PRODUCT_STANCE.brandName.toLowerCase()).not.toBe("career-ops");
    expect(PRODUCT_STANCE.portalScanFirst).toBe(true);
    expect(PRODUCT_STANCE.assistedApplyOnly).toBe(true);
  });
});

describe("OEM Workday boards", () => {
  it("lists verified India-hiring industrial tenants", async () => {
    const { INDIA_OEM_WORKDAY_BOARDS, workdayJobsUrl } = await import(
      "@/lib/jobs/oem-workday-boards"
    );
    expect(INDIA_OEM_WORKDAY_BOARDS.length).toBeGreaterThanOrEqual(4);
    expect(INDIA_OEM_WORKDAY_BOARDS.every((b) => b.host.includes("myworkdayjobs.com"))).toBe(
      true,
    );
    expect(workdayJobsUrl(INDIA_OEM_WORKDAY_BOARDS[0])).toContain("/wday/cxs/");
  });

  it("keeps India locations and rejects USA-only", async () => {
    const { indiaRelevantLocation } = await import("@/lib/jobs/portal-filters");
    expect(
      indiaRelevantLocation("Hyderabad-Andhra Pradesh-India", {
        targetRole: "Sales Manager",
        yearsExperience: 8,
        cities: ["Hyderabad"],
        industryPack: "manufacturing_scm",
        openToRelocate: false,
      }),
    ).toBe(true);
    expect(
      indiaRelevantLocation("San Francisco, CA", {
        targetRole: "Sales Manager",
        yearsExperience: 8,
        cities: ["Pune"],
        industryPack: "manufacturing_scm",
        openToRelocate: true,
      }),
    ).toBe(false);
    expect(
      indiaRelevantLocation("Remote - USA", {
        targetRole: "Sales Manager",
        yearsExperience: 8,
        cities: ["Pune"],
        industryPack: "manufacturing_scm",
        openToRelocate: true,
      }),
    ).toBe(false);
  });
});

describe("pilot buy-bar", () => {
  it("defines refundable pilot thresholds", () => {
    expect(PRODUCT_STANCE.candidateBuyBar.pilotDays).toBe(14);
    expect(PRODUCT_STANCE.candidateBuyBar.pilotMinSeats).toBe(5);
    expect(PRODUCT_STANCE.candidateBuyBar.pilotMinPackets).toBe(3);
    expect(PRODUCT_STANCE.candidateBuyBar.refundPromise.toLowerCase()).toContain("refund");
  });
});

describe("portal boards", () => {
  it("only keeps India-hiring manufacturing boards", () => {
    const boards = boardsForRoleFamily("sales");
    expect(boards.every((b) => b.indiaHiring)).toBe(true);
    expect(boards.some((b) => b.token === "samsara" || b.token === "notion")).toBe(false);
    expect(boards.length).toBeGreaterThan(0);
  });
});

describe("legitimacy", () => {
  it("fails spam / telegram-only postings", () => {
    const report = assessPostingLegitimacy({
      title: "Urgent hiring!!!",
      company: "XYZ",
      description: "Send resume whatsapp only earn 2 lakh per day guaranteed income work from home",
      applyUrl: "https://t.me/scamjobs",
    });
    expect(report.ok).toBe(false);
    expect(report.grade).toBe("fail");
  });

  it("passes a normal official-looking JD", () => {
    const report = assessPostingLegitimacy({
      title: "Purchase Manager",
      company: "Siemens",
      description:
        "We are hiring a Purchase Manager for our Pune plant. You will own vendor negotiation, SAP MM, and OTIF for direct materials across two factories. Notice period discussion welcome. Apply on careers.",
      applyUrl: "https://jobs.siemens.com/careers/job/123",
      sourceOfficial: true,
      postedAt: new Date().toISOString(),
    });
    expect(report.ok).toBe(true);
    expect(report.grade).toBe("pass");
  });
});

describe("alert ingest", () => {
  it("extracts LinkedIn and careers URLs from alert-like text", () => {
    const text = `LinkedIn Job Alert
New jobs for you
https://www.linkedin.com/jobs/view/12345
Also see https://boards.greenhouse.io/samsara/jobs/456789
Thanks`;
    const urls = extractJobUrlsFromAlertText(text);
    expect(urls.some((u) => u.includes("greenhouse"))).toBe(true);
    const ingested = ingestAlertOrPaste(text);
    expect(ingested.isAlert).toBe(true);
    expect(ingested.urls.length).toBeGreaterThan(0);
  });
});

describe("packet pdf", () => {
  it("builds HTML packet and a valid-looking PDF header", () => {
    const html = buildPacketHtml({
      title: "Sales Manager",
      company: "ABB",
      resumeMarkdown: "# Name\n\n## Experience\n\n- Led channel sales in West India",
      brandName: "CareerOS",
    });
    expect(html).toContain("CareerOS");
    expect(html).toContain("Sales Manager");
    const pdf = buildSimpleTextPdf("Hello CareerOS packet");
    const head = Buffer.from(pdf.slice(0, 8)).toString("utf8");
    expect(head.startsWith("%PDF")).toBe(true);
  });
});

describe("win kit", () => {
  it("flags notice knockout when JD wants immediate joiners", () => {
    const flags = detectKnockOuts({
      jobDescription: "Immediate joiners only. Notice period of 30 days preferred.",
      targets: {
        targetRole: "Purchase Manager",
        yearsExperience: 10,
        cities: ["Pune"],
        industryPack: "manufacturing_scm",
        openToRelocate: true,
        noticeDays: 90,
      },
    });
    expect(flags.some((f) => /notice/i.test(f.question))).toBe(true);
  });

  it("builds India CTC negotiation script from targets", () => {
    const script = buildNegotiationScript({
      targetRole: "RSM",
      yearsExperience: 8,
      cities: ["Mumbai"],
      industryPack: "manufacturing_scm",
      openToRelocate: true,
      ctcMinLpa: 20,
      ctcMaxLpa: 28,
    });
    expect(script.targetLpa).toBe(24);
    expect(script.opener).toMatch(/24 LPA/);
  });
});
