/**
 * Win layer: apply-assist answers, knock-out checks, LinkedIn outreach,
 * STAR interview bank, India CTC negotiation — drafts only; human sends/submits.
 */

import { llmGenerate } from "@/lib/ai/llm";
import type { CareerTargets } from "@/lib/db/types";

export type KnockOutFlag = {
  question: string;
  risk: "high" | "medium";
  suggestion: string;
};

export type ApplyAssistPacket = {
  knockouts: KnockOutFlag[];
  formAnswers: Array<{ prompt: string; answer: string }>;
  honestyNote: string;
};

export type OutreachDraft = {
  channel: "linkedin" | "email";
  subject?: string;
  body: string;
  maxChars: number;
};

export type StarStory = {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
};

export type NegotiationScript = {
  targetLpa?: number;
  floorLpa?: number;
  opener: string;
  pushback: string;
  walkaway: string;
};

function extractYears(text: string): number | null {
  const m = text.match(/(\d+)\+?\s*\+?\s*years?/i);
  return m ? Number(m[1]) : null;
}

export function detectKnockOuts(opts: {
  jobDescription: string;
  targets?: CareerTargets | null;
  resumeText?: string;
}): KnockOutFlag[] {
  const flags: KnockOutFlag[] = [];
  const jd = opts.jobDescription || "";
  const yearsNeed = extractYears(jd);
  const yearsHave = opts.targets?.yearsExperience;
  if (yearsNeed != null && yearsHave != null && yearsHave + 1 < yearsNeed) {
    flags.push({
      question: `Minimum ${yearsNeed}+ years experience`,
      risk: "high",
      suggestion: `Profile shows ~${yearsHave} years — answering "${yearsHave}" may auto-reject. Decide honestly before applying.`,
    });
  }
  if (/must be (an? )?indian citizen|only indian nationals/i.test(jd)) {
    flags.push({
      question: "Indian citizenship / nationality",
      risk: "medium",
      suggestion: "Confirm you meet nationality requirements before investing time.",
    });
  }
  if (/notice\s*(period)?\s*(of\s*)?(15|30)\s*days|immediate joiners only/i.test(jd)) {
    const notice = opts.targets?.noticeDays;
    if (notice != null && notice > 45) {
      flags.push({
        question: "Short / immediate notice",
        risk: "high",
        suggestion: `Your notice is ~${notice} days — employer may want faster joining. Be ready to explain buyout / early release.`,
      });
    }
  }
  if (/no visa sponsorship|must have (h1b|work authorization)|us work authorization required/i.test(jd)) {
    flags.push({
      question: "Work authorization",
      risk: "high",
      suggestion: "JD may block candidates needing sponsorship — verify location is India-based before applying.",
    });
  }
  void opts.resumeText;
  return flags.slice(0, 6);
}

export function buildNegotiationScript(targets?: CareerTargets | null): NegotiationScript {
  const floor = targets?.ctcMinLpa;
  const ceil = targets?.ctcMaxLpa;
  const mid =
    floor != null && ceil != null
      ? Math.round((floor + ceil) / 2)
      : ceil || floor || undefined;
  return {
    targetLpa: mid,
    floorLpa: floor,
    opener:
      mid != null
        ? `Based on market for this scope in my target cities, I'm aligning around ${mid} LPA fixed. Happy to discuss the full split (fixed / variable / joining).`
        : `I'm happy to share a range once I understand the full scope, location, and variable pay. What band is approved for this role?`,
    pushback:
      floor != null
        ? `Below ${floor} LPA fixed would be difficult given my current package and notice — is there flexibility on fixed, joining bonus, or ESOP?`
        : `I'd like to stay close to market for this level — can we revisit after I share my current CTC breakup?`,
    walkaway:
      floor != null
        ? `If fixed stays under ${floor} LPA with no bridging bonus, I'll respectfully decline and stay open for the next fit.`
        : `If the band is far from market for this scope, I'll stay open for roles that match the responsibility.`,
  };
}

function fallbackStarStories(resumeText: string): StarStory[] {
  const lines = resumeText
    .split(/\n/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter((l) => l.length > 40 && /\d/.test(l))
    .slice(0, 3);
  if (!lines.length) {
    return [
      {
        title: "Ownership under constraint",
        situation: "A critical metric or delivery was at risk in my function.",
        task: "I owned diagnosis and a fix plan with stakeholders.",
        action: "Aligned plant/vendor/sales partners, ran a short loop, removed the blocker.",
        result: "Stabilized the metric and documented the playbook.",
        reflection: "I lead with evidence and stakeholder clarity under time pressure.",
      },
    ];
  }
  return lines.map((line, i) => ({
    title: `Proof point ${i + 1}`,
    situation: "Context from my resume experience.",
    task: "Deliver a measurable outcome in my owned scope.",
    action: line.slice(0, 220),
    result: "See quantified outcome in the bullet — keep numbers exact in the interview.",
    reflection: "I will not invent metrics beyond what my resume already states.",
  }));
}

export async function generateWinKit(opts: {
  mode: "apply_assist" | "outreach" | "interview_stories" | "negotiate";
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeText: string;
  targets?: CareerTargets | null;
  contactName?: string;
}): Promise<{
  applyAssist?: ApplyAssistPacket;
  outreach?: OutreachDraft;
  stories?: StarStory[];
  negotiation?: NegotiationScript;
  source: "llm" | "heuristic";
}> {
  const knockouts = detectKnockOuts({
    jobDescription: opts.jobDescription,
    targets: opts.targets,
    resumeText: opts.resumeText,
  });

  if (opts.mode === "negotiate") {
    return { negotiation: buildNegotiationScript(opts.targets), source: "heuristic" };
  }

  if (opts.mode === "apply_assist") {
    const prompt = `You help a candidate fill employer application forms. Draft ONLY truthful answers from the resume. Never invent employers, degrees, or metrics.
Job: ${opts.jobTitle} at ${opts.company}
JD (excerpt): ${opts.jobDescription.slice(0, 2500)}
Resume (excerpt): ${opts.resumeText.slice(0, 3500)}
Return JSON: {"formAnswers":[{"prompt":"Why this role?","answer":"..."},{"prompt":"Relevant experience summary","answer":"..."},{"prompt":"Notice period","answer":"..."},{"prompt":"Expected CTC (LPA)","answer":"..."}]}`;
    const raw = await llmGenerate(prompt, { temperature: 0.3, maxTokens: 1200 });
    let formAnswers: ApplyAssistPacket["formAnswers"] = [
      {
        prompt: "Why this role?",
        answer: `I am targeting ${opts.jobTitle}-scope work at ${opts.company} aligned to my background. I will only claim experience present in my resume.`,
      },
      {
        prompt: "Notice period",
        answer:
          opts.targets?.noticeDays != null
            ? `${opts.targets.noticeDays} days`
            : "As per my current employment terms (confirm before submit).",
      },
      {
        prompt: "Expected CTC (LPA)",
        answer:
          opts.targets?.ctcMinLpa || opts.targets?.ctcMaxLpa
            ? `${opts.targets?.ctcMinLpa || "—"}–${opts.targets?.ctcMaxLpa || "—"} LPA`
            : "Open to discuss based on role scope and location.",
      },
    ];
    if (raw) {
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]) as { formAnswers?: ApplyAssistPacket["formAnswers"] };
          if (parsed.formAnswers?.length) formAnswers = parsed.formAnswers;
        }
      } catch {
        /* keep heuristic */
      }
    }
    return {
      applyAssist: {
        knockouts,
        formAnswers,
        honestyNote:
          "CareerOS never submits. Copy answers into the employer form, review knock-outs, then you click Submit.",
      },
      source: raw ? "llm" : "heuristic",
    };
  }

  if (opts.mode === "outreach") {
    const name = opts.contactName?.trim() || "there";
    const prompt = `Draft a ≤300 character LinkedIn connection/note for a job seeker. No em-dashes. No fluff. Truthful.
Role: ${opts.jobTitle} at ${opts.company}
Candidate resume excerpt: ${opts.resumeText.slice(0, 1500)}
Contact first name: ${name}
Return ONLY the message text.`;
    const raw = await llmGenerate(prompt, { temperature: 0.5, maxTokens: 200 });
    const body = (raw ||
      `Hi ${name}, I applied for ${opts.jobTitle} at ${opts.company} and have hands-on experience matching the core scope. Open to a brief chat if useful.`)
      .replace(/\u2014/g, "-")
      .trim()
      .slice(0, 300);
    return {
      outreach: { channel: "linkedin", body, maxChars: 300 },
      source: raw ? "llm" : "heuristic",
    };
  }

  // interview_stories
  const prompt = `Build 3 STAR+R interview stories ONLY from facts in the resume. No invented metrics.
Resume: ${opts.resumeText.slice(0, 4000)}
Target role: ${opts.jobTitle}
Return JSON: {"stories":[{"title":"","situation":"","task":"","action":"","result":"","reflection":""}]}`;
  const raw = await llmGenerate(prompt, { temperature: 0.4, maxTokens: 1600 });
  let stories = fallbackStarStories(opts.resumeText);
  if (raw) {
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { stories?: StarStory[] };
        if (parsed.stories?.length) stories = parsed.stories.slice(0, 5);
      }
    } catch {
      /* heuristic */
    }
  }
  return { stories, source: raw ? "llm" : "heuristic" };
}
