import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { runLocalUserDigest } from "@/lib/jobs/run-digest";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import { PRODUCT_STANCE } from "@/lib/product/stance";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
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
    const sb = getServiceSupabase()!;
    const { data: profiles } = await sb.from("profiles").select("id").limit(25);
    const { runSupabaseUserDigest } = await import("@/lib/jobs/run-digest-supabase");
    const results: Array<{ userId: string; status: number; body: unknown }> = [];

    for (const profile of profiles || []) {
      try {
        const body = await runSupabaseUserDigest({
          userId: String(profile.id),
          autoPrepare: false,
        });
        results.push({ userId: String(profile.id), status: 200, body });
      } catch (e) {
        results.push({
          userId: String(profile.id),
          status: 500,
          body: { message: e instanceof Error ? e.message : "digest failed" },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: "supabase",
      users: (profiles || []).length,
      results: results.map((r) => ({
        userId: r.userId,
        created: (r.body as { created?: number })?.created ?? 0,
        skipped: (r.body as { skipped?: string })?.skipped,
        live: (r.body as { live?: unknown })?.live,
      })),
      stance: {
        dailyDigestRunsMax: PRODUCT_STANCE.dailyDigestRunsMax,
        dailyQueueCap: PRODUCT_STANCE.dailyQueueCap,
        fullWebScrape: PRODUCT_STANCE.fullWebScrape,
      },
    });
  }

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
