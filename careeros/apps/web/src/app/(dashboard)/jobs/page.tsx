"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, ExternalLink, MapPin, IndianRupee, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { EmptyState } from "@/components/shared/empty-state/EmptyState";
import { TableSkeleton } from "@/components/shared/loading/TableSkeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import type { JobRecord, ResumeRecord } from "@/lib/db/types";
import { useRouter } from "next/navigation";

type JobRow = JobRecord & {
  matchLive?: boolean;
  matchGrade?: string | null;
  matchWhy?: string[];
  matchGaps?: string[];
  sourceUrl?: string | null;
};

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api<JobRow[]>("/jobs"),
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => api<ResumeRecord[]>("/resume"),
  });

  const trackMutation = useMutation({
    mutationFn: (job: JobRow) =>
      api<{ applyUrl?: string | null }>("/applications", {
        method: "POST",
        body: { jobId: job.id },
      }),
    onSuccess: (res, job) => {
      const url = res.applyUrl || job.sourceUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.success("Opened careers — mark Applied in Applications after you submit their form");
      } else {
        toast.success("Logged — apply on the company site, then update status to Applied");
      }
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (err: Error) => {
      toast.error(err instanceof ApiError ? err.message : "Could not track apply");
    },
  });

  const tailorMutation = useMutation({
    mutationFn: (jobId: string) => {
      const resumeId = resumes[0]?.id;
      if (!resumeId) throw new Error("Upload a resume first");
      return api("/ai/optimize-for-job", {
        method: "POST",
        body: { resumeId, jobId },
      });
    },
    onSuccess: () => {
      toast.success("Tailored resume + cover letter saved under Resume → Versions");
      router.push("/resume");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = jobs.filter((job) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      job.title.toLowerCase().includes(q) ||
      job.company.toLowerCase().includes(q) ||
      job.location.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Company watchlist only — not live vacancies. Apply from Daily queue when a real OEM posting is found, or paste a JD."
        action={
          <Input
            placeholder="Search jobs..."
            className="w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      />

      <p className="text-sm text-muted-foreground">
        Prefer the{" "}
        <Link href="/queue" className="font-medium underline">
          Daily queue
        </Link>{" "}
        for graded seats + prepare packet → Confirm apply. Match % below uses your resume + career
        targets when available.
      </p>

      {isLoading && <TableSkeleton rows={4} />}
      {error && (
        <EmptyState title="Could not load jobs" description={(error as Error).message} />
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          title="No jobs yet"
          description="Run Daily queue search to pull real OEM postings with apply URLs. Catalog seeds are hidden."
        />
      )}

      <div className="grid gap-4">
        {filtered.map((job) => (
          <Card key={job.id} className="transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription className="mt-1 flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                    {job.salary && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        {job.salary}
                      </span>
                    )}
                  </CardDescription>
                </div>
                {typeof job.matchScore === "number" && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{job.matchScore}%</div>
                    <div className="text-xs text-muted-foreground">
                      {job.matchLive
                        ? job.matchGrade
                          ? `Grade ${job.matchGrade}`
                          : "Live match"
                        : "Seed rank"}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-muted-foreground line-clamp-2">{job.description}</p>
              {job.matchWhy && job.matchWhy.length > 0 && (
                <ul className="mb-3 list-inside list-disc text-xs text-muted-foreground">
                  {job.matchWhy.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              {(job.sourceLabel || job.sourceKind) && (
                <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {job.sourceLabel ? `Found on: ${job.sourceLabel}` : `Source: ${job.sourceKind}`}
                  {job.sourceOfficial ? " · official source" : ""}
                  {job.roleFamily ? ` · ${job.roleFamily}` : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => trackMutation.mutate(job)}
                  disabled={trackMutation.isPending}
                >
                  Track + open careers
                </Button>
                {job.sourceUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    render={<a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" />}
                  >
                    <ExternalLink className="mr-1 h-4 w-4" />
                    Original posting
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => tailorMutation.mutate(job.id)}
                  disabled={tailorMutation.isPending}
                >
                  <Wand2 className="mr-1 h-4 w-4" />
                  Optimize resume
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
