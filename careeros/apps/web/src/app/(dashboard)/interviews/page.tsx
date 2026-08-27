"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { INTERVIEW_DEBRIEF_TEMPLATE } from "@/lib/product/hunt-loop";

type Row = {
  id: string;
  status: string;
  notes?: string;
  job?: { title?: string; company?: string; location?: string };
};

export default function InterviewsPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api<Row[]>("/applications"),
  });

  const move = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api(`/applications/${id}`, { method: "PATCH", body: { status, notes } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["value-stats"] });
      queryClient.invalidateQueries({ queryKey: ["hunt-today"] });
      toast.success("Interview logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const interviews = data.filter((a) => a.status === "interview");
  const applied = data.filter((a) => a.status === "applied" || a.status === "shortlisted");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interviews"
        description="Log real interviews from confirmed submits. This is how CareerOS proves conversion — not vanity queue counts."
        action={
          <Button variant="outline" render={<Link href="/applications" />}>
            Open tracker
          </Button>
        }
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logged interviews</CardTitle>
            <CardDescription>{interviews.length} in pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {interviews.length === 0 && (
              <p className="text-sm text-muted-foreground">None yet. Log from a confirmed submit.</p>
            )}
            {interviews.map((a) => (
              <div key={a.id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">
                  {a.job?.title || "Role"} · {a.job?.company || "Employer"}
                </div>
                {a.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() =>
                      move.mutate({
                        id: a.id,
                        status: "interview",
                        notes: INTERVIEW_DEBRIEF_TEMPLATE,
                      })
                    }
                  >
                    Insert debrief template
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirmed submits — log interview</CardTitle>
            <CardDescription>Only after you actually got a call / round.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {applied.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Confirm a submit on Daily queue first, then log the interview here.
              </p>
            )}
            {applied.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <div className="font-medium">{a.job?.title || "Role"}</div>
                  <div className="text-xs text-muted-foreground">{a.job?.company}</div>
                </div>
                <Button
                  size="sm"
                  disabled={move.isPending}
                  onClick={() =>
                    move.mutate({
                      id: a.id,
                      status: "interview",
                      notes: a.notes || INTERVIEW_DEBRIEF_TEMPLATE,
                    })
                  }
                >
                  Log interview
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
