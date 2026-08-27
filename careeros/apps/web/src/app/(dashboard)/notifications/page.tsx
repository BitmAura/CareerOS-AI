"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function NotificationsPage() {
  const { data: hunt } = useQuery({
    queryKey: ["hunt-today"],
    queryFn: () =>
      api<{
        followUps: Array<{ applicationId: string; company: string; title: string; hint: string }>;
        actions: Array<{ id: string; label: string }>;
      }>("/hunt-today"),
  });

  const followUps = hunt?.followUps || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Follow-ups from your hunt loop — CareerOS never emails recruiters for you."
      />
      {followUps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No follow-ups due. Work today’s hunt on the dashboard.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Due now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {followUps.map((f) => (
              <div key={f.applicationId} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">
                  {f.title} · {f.company}
                </div>
                <p className="text-xs text-muted-foreground">{f.hint}</p>
              </div>
            ))}
            <Button size="sm" render={<Link href="/applications" />}>
              Open applications
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
