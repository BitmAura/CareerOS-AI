import { describe, it, expect } from "vitest";
import { buildAtsScorecard } from "./ats-scorecard";
import { parsedDataToMarkdown } from "./to-markdown";

describe("ATS Scorecard & Resume Engine Verification", () => {
  it("detects bad date format like 'till date' or 'ongoing'", () => {
    const text = `
# John Doe
john@example.com | +91 9876543210 | Pune

## Professional Summary
Procurement professional with 6 years experience in SAP MM.

## Experience
### Purchase Lead — Tata Motors
2020 – till date
- Managed vendor development
`;
    const res = buildAtsScorecard(text);
    const dateCheck = res.scorecard.checks.find((c) => c.label.includes("Date format"));
    expect(dateCheck?.passed).toBe(false);
  });

  it("passes clean MMM YYYY – MMM YYYY dates", () => {
    const text = `
# Rajesh Sharma
rajesh@careeros.ai | +91 9876543210 | Pune | linkedin.com/in/rajesh

## Professional Summary
7+ years in procurement and SCM across automotive manufacturing. Led cost reduction of 8.4% across 40 vendors with SAP MM integration.

## Skills
Procurement · Purchase · SAP MM · SCM · OTIF · Vendor Development · Negotiation · Kaizen · 5S · Six Sigma

## Experience
### SCM Lead — Tata Motors
Jan 2020 – Mar 2024
- Led direct material procurement worth Rs. 35 Cr annually with 8.4% cost reduction.
- Improved OTIF delivery compliance from 82% to 94% across 42 suppliers.
- Implemented SAP MM purchase order tracking reducing lead times by 6 days.

## Education
- B.Tech Mechanical — Pune University (2017)
`;
    const res = buildAtsScorecard(text);
    const dateCheck = res.scorecard.checks.find((c) => c.label.includes("Date format"));
    const quantCheck = res.scorecard.checks.find((c) => c.label.includes("metrics / numbers"));
    const orderCheck = res.scorecard.checks.find((c) => c.label.includes("Summary appears before Experience"));

    expect(dateCheck?.passed).toBe(true);
    expect(quantCheck?.passed).toBe(true);
    expect(orderCheck?.passed).toBe(true);
    expect(res.scorecard.overall).toBeGreaterThanOrEqual(85);
  });

  it("exports clean markdown without photos in ATS mode", () => {
    const sampleData = {
      contact: {
        name: "Rajesh Sharma",
        email: "rajesh@careeros.ai",
        phone: "+91 9876543210",
        location: "Pune",
        photoUrl: "https://example.com/photo.jpg",
      },
      summary: "Procurement leader with SAP MM background.",
      skills: ["SAP MM", "Procurement", "OTIF"],
      experience: [
        {
          role: "Procurement Manager",
          company: "Bosch",
          startDate: "Jan 2021",
          endDate: "Present",
          bullets: ["Managed Rs. 20 Cr spend with 7% cost savings."],
        },
      ],
      education: [
        {
          degree: "B.Tech",
          institution: "NIT",
          year: "2018",
        },
      ],
    };

    const atsMd = parsedDataToMarkdown(sampleData as any, "ats");
    expect(atsMd).not.toContain("photo:");
    expect(atsMd).not.toContain("photo attached");
    expect(atsMd).toContain("# Rajesh Sharma");
    expect(atsMd).toContain("rajesh@careeros.ai");
  });
});
