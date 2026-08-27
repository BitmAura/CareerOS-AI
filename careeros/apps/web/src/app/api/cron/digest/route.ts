import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { runLocalUserDigest } from "@/lib/jobs/run-digest";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { PRODUCT_STANCE } from "@/lib/product/stance";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Local/dev: allow without secret so manual testing works
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const header = req.headers.get("x-cron-secret") || "";
  return bearer === secret || header === secret;
}

/**
 * Scheduled discovery (assisted apply).
 * Vercel Hobby may only fire 1 cron/day — product still allows 3 manual runs.
 * Does NOT scrape LinkedIn/Naukri or the whole internet.
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: "supabase",
      note: "Wire per-user digest via service role in a follow-up; local mode runs below.",
      stance: {
        dailyDigestRunsMax: PRODUCT_STANCE.dailyDigestRunsMax,
        fullWebScrape: PRODUCT_STANCE.fullWebScrape,
      },
    });
  }

  // Enumerate users from local store file
  const dbPath = path.join(process.cwd(), ".data", "store.json");
  let userIds: string[] = [];
  try {
    const raw = await fs.readFile(dbPath, "utf8");
    const db = JSON.parse(raw) as { users?: Array<{ id: string }> };
    userIds = (db.users || []).map((u) => u.id);
  } catch {
    userIds = [];
  }

  const results = [];
  for (const userId of userIds) {
    results.push(await runLocalUserDigest({ userId, autoPrepare: true }));
  }

  return NextResponse.json({
    ok: true,
    mode: "local",
    users: userIds.length,
    results: results.map((r) => ({
      userId: r.userId,
      created: r.created,
      slotLabel: r.slotLabel,
      skipped: r.skipped,
    })),
    stance: {
      dailyDigestRunsMax: PRODUCT_STANCE.dailyDigestRunsMax,
      dailyQueueCap: PRODUCT_STANCE.dailyQueueCap,
      fullWebScrape: false,
      assistedApplyOnly: true,
    },
  });
}

export async function POST(req: Request) {
  return GET(req);
}
