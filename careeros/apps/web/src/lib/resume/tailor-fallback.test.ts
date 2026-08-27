import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/llm", () => ({
  llmGenerate: vi.fn(async () => null),
  llmStatus: () => ({ provider: "none", model: "heuristic-rules-only", openSourcePath: false }),
  resolveLlmProvider: () => "none",
}));

import { tailorResumeForJob } from "@/lib/resume/analyze";

describe("tailor fallback", () => {
  it("keeps ATS shape and never appends Keywords emphasized", async () => {
    const raw = `# D Pradeep Kumar
pradeep@example.com | 9999999999 | Pune

## Professional Summary
Sales leader with channel and key account experience in manufacturing.

## Skills
Sales, Key Account, Channel, Negotiation, B2B

## Experience
### Regional Sales Manager — Acme Corp
2018 — Present
- Grew dealer network revenue by 20%
- Managed institutional accounts across West India

## Education
### B.E. — State University
2014
`;
    const out = await tailorResumeForJob(raw, {
      title: "Regional Sales Manager",
      company: "Schaeffler",
      description: "B2B industrial sales key account channel distributor",
      requirements: ["Sales", "Key Account", "Channel"],
    });
    expect(out.markdown).not.toMatch(/Keywords emphasized/i);
    expect(out.markdown).toMatch(/Professional Summary|Skills|Experience/i);
    expect(out.notes).toMatch(/Offline|template|OPENAI|GEMINI/i);
    expect(typeof out.aiScore).toBe("number");
  });
});
