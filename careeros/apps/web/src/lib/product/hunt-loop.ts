/**
 * Daily hunt loop — Life OS ritual + job-search OS follow-ups.
 * Patterns from open repos (career-ops follow-up, JobHuntOS debrief),
 * hosted for India manufacturing candidates. Never auto-submit.
 */

import { PRODUCT_STANCE } from "@/lib/product/stance";

export type HuntAction = {
  id: string;
  label: string;
  href: string;
  why: string;
  cta: string;
};

export type HuntFollowUp = {
  applicationId: string;
  company: string;
  title: string;
  kind: "confirm_submit" | "follow_recruiter" | "interview_debrief";
  ageDays: number;
  hint: string;
};

export type HuntToday = {
  date: string;
  ritual: string;
  actions: HuntAction[];
  followUps: HuntFollowUp[];
};

function ageDays(iso?: string): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

export function buildHuntToday(input: {
  targetsReady: boolean;
  resumeCount: number;
  queuePending: number;
  seatsRemaining: number;
  runsRemaining: number;
  applications: Array<{
    id: string;
    status: string;
    appliedAt?: string;
    updatedAt?: string;
    notes?: string;
    job?: { company?: string; title?: string };
  }>;
}): HuntToday {
  const date = new Date().toISOString().slice(0, 10);
  const actions: HuntAction[] = [];

  if (!input.targetsReady) {
    actions.push({
      id: "profile",
      label: "Set hunt targets",
      href: "/profile?onboarding=1",
      why: "Search and match are empty without role, cities, CTC, notice.",
      cta: "Open profile",
    });
  }
  if (input.resumeCount <= 0) {
    actions.push({
      id: "resume",
      label: "Upload resume",
      href: "/resume",
      why: "Packets cannot be prepared without a source resume.",
      cta: "Open resume",
    });
  }
  if (input.targetsReady && input.resumeCount > 0 && input.queuePending === 0 && input.runsRemaining > 0) {
    actions.push({
      id: "search",
      label: "Run today’s search",
      href: "/queue",
      why: `Up to ${PRODUCT_STANCE.dailyDigestRunsMax} searches/day. OEM Workday + portals first.`,
      cta: "Open queue",
    });
  }
  if (input.queuePending > 0) {
    actions.push({
      id: "prepare",
      label: `Work ${input.queuePending} open seat${input.queuePending === 1 ? "" : "s"}`,
      href: "/queue",
      why: "Prepare packet → open employer site → you submit → confirm.",
      cta: "Review queue",
    });
  }

  const followUps: HuntFollowUp[] = [];
  for (const app of input.applications) {
    const status = (app.status || "").toLowerCase();
    const age = ageDays(app.updatedAt || app.appliedAt);
    const company = app.job?.company || "Employer";
    const title = app.job?.title || "Role";
    if (status === "opened" && age >= 1) {
      followUps.push({
        applicationId: app.id,
        company,
        title,
        kind: "confirm_submit",
        ageDays: age,
        hint: `Opened ${age}d ago — confirm submit or drop it. Opening is not an application.`,
      });
    } else if (status === "applied" && age >= 7) {
      followUps.push({
        applicationId: app.id,
        company,
        title,
        kind: "follow_recruiter",
        ageDays: age,
        hint: `Submitted ${age}d ago — send a short follow-up (CareerOS never sends it for you).`,
      });
    } else if (status === "interview" && !(app.notes || "").trim()) {
      followUps.push({
        applicationId: app.id,
        company,
        title,
        kind: "interview_debrief",
        ageDays: age,
        hint: "Log a 3-line debrief (what they asked, what landed, what to reuse) so the hunt compounds.",
      });
    }
  }

  if (followUps.length && !actions.some((a) => a.id === "follow")) {
    actions.push({
      id: "follow",
      label: `${followUps.length} follow-up${followUps.length === 1 ? "" : "s"} due`,
      href: "/applications",
      why: "Open-source hunt OS pattern: the corpus only improves if you close loops.",
      cta: "Open tracker",
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "clear",
      label: input.runsRemaining > 0 ? "Queue is clear — run another search" : "Slots used — close loops",
      href: input.runsRemaining > 0 ? "/queue" : "/applications",
      why: "No open seats. Search again or log interviews from confirmed submits.",
      cta: input.runsRemaining > 0 ? "Open queue" : "Open tracker",
    });
  }

  const ritual =
    actions[0]?.id === "profile"
      ? "Morning: targets → resume → first search (under 20 minutes)."
      : actions[0]?.id === "search"
        ? "Morning/Midday/Evening search, then packets, then you submit."
        : "Work seats, confirm real submits, log interviews. That is the OS.";

  return {
    date,
    ritual,
    actions: actions.slice(0, 4),
    followUps: followUps.slice(0, 8),
  };
}

export const INTERVIEW_DEBRIEF_TEMPLATE =
  "Debrief: asked ___. I used story ___. Next time emphasize ___. (facts only — no invented metrics)";
