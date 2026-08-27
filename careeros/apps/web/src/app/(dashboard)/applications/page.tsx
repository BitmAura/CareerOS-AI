"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { StatusBadge } from "@/components/shared/status-badge/StatusBadge";
import { EmptyState } from "@/components/shared/empty-state/EmptyState";
import { TableSkeleton } from "@/components/shared/loading/TableSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatDisplayDate } from "@/lib/format";
import { INTERVIEW_DEBRIEF_TEMPLATE } from "@/lib/product/hunt-loop";
import { useState } from "react";

type ApplicationRow = {
  id: string;
  status: string;
  appliedAt: string;
  coverLetter?: string;
  notes?: string;
  resumeVersionId?: string;
  job?: {
    company: string;
    title: string;
    location?: string;
    sourceUrl?: string | null;
  };
};

const COLUMNS = [
  { id: "opened", label: "Opened" },
  { id: "applied", label: "Applied" },
  { id: "shortlisted", label: "Shortlisted" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
] as const;

type ColId = (typeof COLUMNS)[number]["id"];

function normalizeStatus(status: string): ColId {
  const s = status.toLowerCase();
  if (
    s === "opened" ||
    s === "shortlisted" ||
    s === "interview" ||
    s === "offer" ||
    s === "rejected" ||
    s === "applied"
  ) {
    return s as ColId;
  }
  return "opened";
}

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api<ApplicationRow[]>("/applications"),
  });

  const { data: hunt } = useQuery({
    queryKey: ["hunt-today"],
    queryFn: () =>
      api<{
        followUps: Array<{
          applicationId: string;
          company: string;
          title: string;
          kind: string;
          ageDays: number;
          hint: string;
        }>;
      }>("/hunt-today"),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: ColId; notes?: string }) =>
      api(`/applications/${id}`, { method: "PATCH", body: { status, notes } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["value-stats"] });
      queryClient.invalidateQueries({ queryKey: ["hunt-today"] });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const byColumn = COLUMNS.map((col) => ({
    ...col,
    items: data.filter((a) => normalizeStatus(a.status) === col.id),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Opened = careers site visited. Applied = you confirmed you submitted on the employer site. CareerOS never auto-submits."
        action={
          <Button variant="outline" render={<Link href="/queue" />}>
            Open daily queue
          </Button>
        }
      />

      {isLoading && <TableSkeleton rows={4} />}

      {error && (
        <EmptyState
          title="Could not load applications"
          description={error instanceof Error ? error.message : "Try again shortly"}
        />
      )}

      {!isLoading && !error && data.length === 0 && (
        <EmptyState
          title="No applications yet"
          description="From Daily queue: Open careers → submit on their site → tap I submitted. That moves the card here."
          action={{ label: "Go to daily queue", onClick: () => (window.location.href = "/queue") }}
        />
      )}

      {hunt?.followUps?.length ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Follow-ups due</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hunt.followUps.map((f) => (
              <div key={f.applicationId} className="rounded-md border bg-background p-2">
                <div className="font-medium">
                  {f.title} · {f.company}
                </div>
                <p className="text-xs text-muted-foreground">{f.hint}</p>
                {f.kind === "interview_debrief" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 text-[10px]"
                    onClick={() =>
                      setNoteDrafts((d) => ({
                        ...d,
                        [f.applicationId]: INTERVIEW_DEBRIEF_TEMPLATE,
                      }))
                    }
                  >
                    Insert debrief template
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error && data.length > 0 && (
        <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-3 lg:grid-cols-6">
          {byColumn.map((col) => (
            <Card key={col.id} className="min-w-[200px]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span>{col.label}</span>
                  <span className="text-muted-foreground tabular-nums">{col.items.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {col.items.length === 0 && (
                  <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    Empty
                  </p>
                )}
                {col.items.map((app) => (
                  <div key={app.id} className="rounded-lg border bg-background p-3 text-sm shadow-sm">
                    <div className="font-medium leading-snug">{app.job?.title || "Role"}</div>
                    <div className="text-xs text-muted-foreground">
                      {app.job?.company || "—"}
                      {app.job?.location ? ` · ${app.job.location}` : ""}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {formatDisplayDate(app.appliedAt)}
                    </div>
                    {app.notes && (
                      <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{app.notes}</p>
                    )}
                    <Input
                      className="mt-2 h-7 text-[10px]"
                      placeholder="Add note…"
                      value={noteDrafts[app.id] ?? ""}
                      onChange={(e) =>
                        setNoteDrafts((d) => ({ ...d, [app.id]: e.target.value }))
                      }
                      onBlur={() => {
                        const notes = noteDrafts[app.id]?.trim();
                        if (!notes || notes === app.notes) return;
                        moveMutation.mutate({
                          id: app.id,
                          status: normalizeStatus(app.status),
                          notes,
                        });
                      }}
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      <StatusBadge status={normalizeStatus(app.status) === "rejected" ? "rejected" : "pending"}>
                        {normalizeStatus(app.status)}
                      </StatusBadge>
                      {app.resumeVersionId && (
                        <span className="text-[10px] text-muted-foreground">packet linked</span>
                      )}
                    </div>
                    {app.job?.sourceUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 px-2 text-[10px]"
                        render={
                          <a href={app.job.sourceUrl} target="_blank" rel="noopener noreferrer" />
                        }
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Careers page
                      </Button>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {COLUMNS.filter((c) => c.id !== normalizeStatus(app.status)).map((c) => (
                        <Button
                          key={c.id}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px]"
                          disabled={moveMutation.isPending}
                          onClick={() =>
                            moveMutation.mutate({
                              id: app.id,
                              status: c.id,
                              notes: noteDrafts[app.id] || app.notes,
                            })
                          }
                        >
                          → {c.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
