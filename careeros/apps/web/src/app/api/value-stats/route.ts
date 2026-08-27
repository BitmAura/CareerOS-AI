import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";

/** Candidate value KPIs — live finds beyond beachhead, packets, confirms, interviews. */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const buy = PRODUCT_STANCE.candidateBuyBar;

  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    const [{ data: queue }, { data: apps }] = await Promise.all([
      sb.from("application_queue").select("status, notes, jobs(source, source_kind)").eq("user_id", user.id),
      sb.from("applications").select("status").eq("user_id", user.id),
    ]);
    const q = (queue || []) as Array<{
      status?: string;
      notes?: string | null;
      jobs?: { source?: string; source_kind?: string } | { source?: string; source_kind?: string }[] | null;
    }>;
    const a = (apps || []) as Array<{ status?: string }>;
    const liveQueued = q.filter((row) => {
      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
      const src = String(job?.source_kind || job?.source || "");
      return /live|workday|greenhouse|portal/i.test(src);
    }).length;
    const pastedQueued = q.filter((row) => /paste|manual/i.test(String(row.notes || ""))).length;
    const beachheadQueued = Math.max(0, q.length - liveQueued - pastedQueued);
    const packetsPrepared = q.filter((row) =>
      ["prepared", "opened", "approved"].includes(String(row.status)),
    ).length;
    const interviews = a.filter((row) => /interview|offer/i.test(String(row.status))).length;
    const confirmed = a.filter((row) =>
      /applied|shortlisted|interview|offer/i.test(String(row.status)),
    ).length;
    const indiaFitSeats = q.length;
    const seatsOk = indiaFitSeats >= buy.pilotMinSeats;
    const packetsOk = packetsPrepared >= buy.pilotMinPackets;
    return NextResponse.json({
      userId: user.id,
      liveQueued,
      beachheadQueued,
      pastedQueued,
      packetsPrepared,
      confirmedApplies: confirmed,
      interviews,
      jobsIWouldHaveMissed: liveQueued,
      interviewRate: confirmed > 0 ? Math.round((interviews / confirmed) * 100) : null,
      updatedAt: new Date().toISOString(),
      storage: "supabase",
      pilot: {
        days: buy.pilotDays,
        minSeats: buy.pilotMinSeats,
        minPackets: buy.pilotMinPackets,
        refundPromise: buy.refundPromise,
        indiaFitSeats,
        packets: packetsPrepared,
        seatsOk,
        packetsOk,
        interviewLogged: interviews > 0,
        readyToPay: seatsOk && packetsOk,
        checks: [
          {
            id: "seats",
            label: `≥${buy.pilotMinSeats} India-fit seats queued`,
            ok: seatsOk,
            value: indiaFitSeats,
          },
          {
            id: "packets",
            label: `≥${buy.pilotMinPackets} tailored packets prepared`,
            ok: packetsOk,
            value: packetsPrepared,
          },
          {
            id: "interview",
            label: "At least 1 interview logged (conversion proof)",
            ok: interviews > 0,
            value: interviews,
          },
        ],
      },
    });
  }

  const stats = await localStore.getValueStats(user.id);
  const apps = await localStore.listApplications(user.id);
  const interviews = apps.filter((a) =>
    /interview|offer/i.test(a.status),
  ).length;
  const confirmed = apps.filter((a) =>
    /applied|shortlisted|interview|offer/i.test(a.status),
  ).length;
  const interviewRate =
    confirmed > 0 ? Math.round((interviews / confirmed) * 100) : null;

  const indiaFitSeats =
    (stats.liveQueued || 0) + (stats.beachheadQueued || 0) + (stats.pastedQueued || 0);
  const packets = stats.packetsPrepared || 0;
  const seatsOk = indiaFitSeats >= buy.pilotMinSeats;
  const packetsOk = packets >= buy.pilotMinPackets;
  const interviewLogged = interviews > 0;
  // Ready to pay = inventory + packets proven; interview is bonus proof
  const readyToPay = seatsOk && packetsOk;

  return NextResponse.json({
    ...stats,
    interviews: Math.max(stats.interviews, interviews),
    confirmedApplies: Math.max(stats.confirmedApplies, confirmed),
    jobsIWouldHaveMissed: stats.liveQueued,
    interviewRate,
    storage: "local",
    pilot: {
      days: buy.pilotDays,
      minSeats: buy.pilotMinSeats,
      minPackets: buy.pilotMinPackets,
      refundPromise: buy.refundPromise,
      indiaFitSeats,
      packets,
      seatsOk,
      packetsOk,
      interviewLogged,
      readyToPay,
      checks: [
        {
          id: "seats",
          label: `≥${buy.pilotMinSeats} India-fit seats queued`,
          ok: seatsOk,
          value: indiaFitSeats,
        },
        {
          id: "packets",
          label: `≥${buy.pilotMinPackets} tailored packets prepared`,
          ok: packetsOk,
          value: packets,
        },
        {
          id: "interview",
          label: "At least 1 interview logged (conversion proof)",
          ok: interviewLogged,
          value: interviews,
        },
      ],
    },
  });
}
