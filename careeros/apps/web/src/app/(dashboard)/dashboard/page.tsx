"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/use-auth";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { api } from "@/lib/api";

const buyBar = PRODUCT_STANCE.candidateBuyBar;

type Application = {
  id: string;
  status: string;
  appliedAt: string;
  job?: { company: string; title: string };
};

type ValueStats = {
  packetsPrepared: number;
  confirmedApplies: number;
  interviews: number;
  jobsIWouldHaveMissed: number;
  interviewRate: number | null;
  pilot?: {
    readyToPay: boolean;
    checks: Array<{ id: string; label: string; ok: boolean; value: number }>;
  };
};

type Hunt = {
  ritual: string;
  actions: Array<{ id: string; label: string; href: string; why: string; cta: string }>;
  followUps: Array<{ applicationId: string; company: string; title: string; hint: string }>;
};

type TargetsInfo = { ready?: boolean };

export default function DashboardPage() {
  const user = useAuth((s) => s.user);

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api<Application[]>("/applications"),
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => api<{ id: string }[]>("/resume"),
  });

  const { data: value } = useQuery({
    queryKey: ["value-stats"],
    queryFn: () => api<ValueStats>("/value-stats"),
  });

  const { data: targets } = useQuery({
    queryKey: ["profile-targets"],
    queryFn: () => api<TargetsInfo>("/profile/targets"),
  });

  const { data: hunt } = useQuery({
    queryKey: ["hunt-today"],
    queryFn: () => api<Hunt>("/hunt-today"),
  });

  const recent = applications.slice(0, 4);
  const needsOnboarding = !targets?.ready || resumes.length === 0;
  const actions =
    hunt?.actions?.length
      ? hunt.actions
      : needsOnboarding
        ? [
            {
              id: "profile",
              label: "Set hunt targets",
              href: "/profile?onboarding=1",
              why: "Role, cities, CTC, notice — then search works.",
              cta: "Profile",
            },
            {
              id: "resume",
              label: "Upload resume",
              href: "/resume",
              why: "Packets need a source resume.",
              cta: "Resume",
            },
          ]
        : [
            {
              id: "search",
              label: "Run today’s search",
              href: "/queue",
              why: "OEM Workday + portals first. You submit.",
              cta: "Queue",
            },
          ];

  const checks = value?.pilot?.checks || [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={`Hello${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description={hunt?.ritual || "Targets → resume → search → you submit."}
        action={
          <Button render={<Link href="/queue" />}>Open daily queue</Button>
        }
      />

      <Card className="border-primary/20">
        <CardContent className="space-y-3 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today’s hunt
          </p>
          <ol className="space-y-3">
            {actions.map((a, i) => (
              <li key={a.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {i + 1}. {a.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.why}</p>
                </div>
                <Button size="sm" variant="secondary" render={<Link href={a.href} />}>
                  {a.cta}
                </Button>
              </li>
            ))}
          </ol>
          {hunt?.followUps?.length ? (
            <p className="text-xs text-muted-foreground">
              {hunt.followUps.length} follow-up{hunt.followUps.length === 1 ? "" : "s"} —{" "}
              <Link href="/applications" className="underline">
                Applications
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Live seats", value: value?.jobsIWouldHaveMissed ?? 0 },
          { label: "Packets", value: value?.packetsPrepared ?? 0 },
          { label: "Submitted", value: value?.confirmedApplies ?? 0 },
          {
            label: "Interviews",
            value:
              value?.interviewRate != null
                ? `${value.interviews} · ${value.interviewRate}%`
                : value?.interviews ?? 0,
          },
        ].map((t) => (
          <div key={t.label} className="rounded-lg border bg-card px-3 py-3">
            <p className="text-[11px] text-muted-foreground">{t.label}</p>
            <p className="text-xl font-semibold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>

      {checks.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Pilot {value?.pilot?.readyToPay ? "earned" : "in progress"}:{" "}
          {checks.map((c) => (c.ok ? "✓" : "○")).join(" ")} seats / packets / interview ·{" "}
          <Link href="/billing" className="underline">
            ₹{buyBar.conciergeInrMonthly.toLocaleString("en-IN")}/mo
          </Link>
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Recent</p>
          <Link href="/applications" className="text-xs text-muted-foreground underline">
            All applications
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing tracked yet. Open a careers site from the queue, then confirm submit.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {recent.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.job?.title || "Role"} · {item.job?.company || "Company"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(item.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={item.status === "rejected" ? "rejected" : "pending"}>
                  {item.status}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
