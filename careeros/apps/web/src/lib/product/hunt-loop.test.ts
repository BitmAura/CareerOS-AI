import { describe, expect, it } from "vitest";
import { buildHuntToday } from "@/lib/product/hunt-loop";

describe("hunt loop", () => {
  it("asks for profile then resume before search", () => {
    const hunt = buildHuntToday({
      targetsReady: false,
      resumeCount: 0,
      queuePending: 0,
      seatsRemaining: 15,
      runsRemaining: 3,
      applications: [],
    });
    expect(hunt.actions.map((a) => a.id)).toEqual(["profile", "resume"]);
  });

  it("flags opened seats that were never confirmed", () => {
    const hunt = buildHuntToday({
      targetsReady: true,
      resumeCount: 1,
      queuePending: 1,
      seatsRemaining: 14,
      runsRemaining: 2,
      applications: [
        {
          id: "a1",
          status: "opened",
          updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          job: { company: "JCI", title: "Sales" },
        },
      ],
    });
    expect(hunt.followUps[0]?.kind).toBe("confirm_submit");
    expect(hunt.actions.some((a) => a.id === "follow")).toBe(true);
  });

  it("asks for interview debrief when notes are empty", () => {
    const hunt = buildHuntToday({
      targetsReady: true,
      resumeCount: 1,
      queuePending: 0,
      seatsRemaining: 15,
      runsRemaining: 0,
      applications: [{ id: "a2", status: "interview", notes: "  " }],
    });
    expect(hunt.followUps[0]?.kind).toBe("interview_debrief");
  });

  it("always returns a next action when the day is otherwise clear", () => {
    const hunt = buildHuntToday({
      targetsReady: true,
      resumeCount: 1,
      queuePending: 0,
      seatsRemaining: 15,
      runsRemaining: 0,
      applications: [],
    });
    expect(hunt.actions.length).toBeGreaterThan(0);
    expect(hunt.actions[0]?.id).toBe("clear");
  });
});
