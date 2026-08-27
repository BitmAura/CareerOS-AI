"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type ValueStats = {
  packetsPrepared: number;
  confirmedApplies: number;
  interviews: number;
  jobsIWouldHaveMissed: number;
  interviewRate: number | null;
};

export default function AnalyticsPage() {
  const { data: value } = useQuery({
    queryKey: ["value-stats"],
    queryFn: () => api<ValueStats>("/value-stats"),
  });

  const tiles = [
    { label: "Live seats found", value: value?.jobsIWouldHaveMissed ?? 0 },
    { label: "Packets prepared", value: value?.packetsPrepared ?? 0 },
    { label: "Confirmed submits", value: value?.confirmedApplies ?? 0 },
    { label: "Interviews logged", value: value?.interviews ?? 0 },
    {
      label: "Interview rate",
      value: value?.interviewRate != null ? `${value.interviewRate}%` : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Pilot proof from your hunt — not portal vanity counts."
        action={
          <Button variant="outline" render={<Link href="/dashboard" />}>
            Dashboard
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{t.value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
