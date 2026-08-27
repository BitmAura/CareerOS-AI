/**
 * Shared helpers for queue notes (preserve rubric when preparing packets).
 */

import type { MatchRubricSnapshot, QueueNotesPayload } from "@/lib/db/types";

export function encodeQueueNotes(payload: QueueNotesPayload): string {
  return JSON.stringify(payload);
}

export function parseQueueNotes(notes?: string | null): QueueNotesPayload {
  if (!notes?.trim()) return {};
  if (!notes.trim().startsWith("{")) {
    return { tailorNotes: notes, action: notes };
  }
  try {
    const parsed = JSON.parse(notes) as QueueNotesPayload & MatchRubricSnapshot;
    // Legacy: notes was the rubric object itself
    if (
      typeof parsed.score === "number" &&
      typeof parsed.grade === "string" &&
      Array.isArray(parsed.why)
    ) {
      const rubric = parsed as unknown as MatchRubricSnapshot;
      return { rubric, action: rubric.action };
    }
    return {
      rubric: parsed.rubric,
      tailorNotes: parsed.tailorNotes,
      action: parsed.action || parsed.rubric?.action || parsed.tailorNotes,
    };
  } catch {
    return { tailorNotes: notes };
  }
}

export function mergeQueueNotes(
  existing: string | null | undefined,
  patch: QueueNotesPayload,
): string {
  const cur = parseQueueNotes(existing);
  return encodeQueueNotes({
    rubric: patch.rubric || cur.rubric,
    tailorNotes: patch.tailorNotes ?? cur.tailorNotes,
    action: patch.action || patch.rubric?.action || cur.action || cur.rubric?.action,
  });
}
