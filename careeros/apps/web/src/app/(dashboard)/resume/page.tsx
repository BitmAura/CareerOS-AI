"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Pencil, Sparkles, Upload, Wand2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state/EmptyState";
import { TableSkeleton } from "@/components/shared/loading/TableSkeleton";
import { StatusBadge } from "@/components/shared/status-badge/StatusBadge";
import { api, ApiError } from "@/lib/api";
import type { ResumeRecord, ResumeSuggestion, ResumeVersion } from "@/lib/db/types";
import type { JobRecord } from "@/lib/db/types";
import type { AtsScorecard, KeywordGapReport } from "@/lib/resume/ats-scorecard";
import { MarkdownResumePreview } from "@/components/resume/markdown-resume-preview";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function ResumePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [targetJd, setTargetJd] = useState("");
  const [previewMarkdown, setPreviewMarkdown] = useState<string>("");
  const [jobId, setJobId] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  const showPreview = (md: string | undefined | null, label = "version") => {
    const content = (md || "").trim();
    if (!content) {
      toast.error(`No content in this ${label} — regenerate improved resume`);
      return;
    }
    setPreviewMarkdown(content);
    requestAnimationFrame(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const { data: resumes = [], isLoading, error } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => api<ResumeRecord[]>("/resume"),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api<JobRecord[]>("/jobs"),
  });

  const activeId = selectedId ?? resumes[0]?.id ?? null;

  const selected = useMemo(
    () => resumes.find((r) => r.id === activeId) || null,
    [resumes, activeId],
  );

  const scorecard = useMemo(() => {
    if (!selected) return null;
    const fromField = selected.atsScorecard as AtsScorecard | undefined;
    if (fromField?.overall != null) return fromField;
    const nested = (selected.parsedData as Record<string, unknown> | undefined)?.atsScorecard as
      | AtsScorecard
      | undefined;
    return nested || null;
  }, [selected]);

  const keywordGap = useMemo(() => {
    if (!selected) return null;
    const fromField = selected.keywordGap as KeywordGapReport | undefined;
    if (fromField) return fromField;
    return (
      ((selected.parsedData as Record<string, unknown> | undefined)?.keywordGap as
        | KeywordGapReport
        | undefined) || null
    );
  }, [selected]);

  const { data: versions = [], refetch: refetchVersions } = useQuery({
    queryKey: ["resume-versions", activeId],
    queryFn: () => api<ResumeVersion[]>(`/resume/${activeId}/versions`),
    enabled: Boolean(activeId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api<ResumeRecord>("/resume/upload", { method: "POST", formData });
    },
    onSuccess: (row) => {
      toast.success(`Analyzed — score ${row.aiScore ?? "—"}`);
      setSelectedId(row.id);
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (err: Error) => toast.error(err instanceof ApiError ? err.message : "Upload failed"),
  });

  const reanalyzeMutation = useMutation({
    mutationFn: () =>
      api(`/resume/${activeId}/analyze`, {
        method: "POST",
        body: {
          ...(pasteText.trim() ? { text: pasteText } : {}),
          ...(targetJd.trim() ? { targetJd } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Re-analyzed with ATS scorecard");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const improveMutation = useMutation({
    mutationFn: () => api<ResumeVersion>(`/resume/${activeId}/improve`, { method: "POST" }),
    onSuccess: (version) => {
      toast.success("ATS-friendly resume generated — scroll to Preview");
      showPreview(version.contentMarkdown, "improved version");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      refetchVersions();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tailorMutation = useMutation({
    mutationFn: () =>
      api<{ version: ResumeVersion; coverLetter: string }>("/ai/optimize-for-job", {
        method: "POST",
        body: { resumeId: activeId, jobId },
      }),
    onSuccess: (data) => {
      toast.success("Job-tailored resume + cover letter ready");
      showPreview(
        `${data.version.contentMarkdown}\n\n---\n\n## Cover Letter\n\n${data.coverLetter}`,
        "tailored version",
      );
      refetchVersions();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const avgScore =
    resumes.length > 0
      ? Math.round(resumes.reduce((s, r) => s + (r.aiScore || 0), 0) / resumes.length)
      : 0;

  const suggestions = (selected?.suggestions || []) as ResumeSuggestion[];

  const downloadMarkdown = (content: string, name: string) => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume Intelligence"
        description="ATS-style readiness scorecard (rules + optional Gemini) · keyword gap · improve · builder. Not connected to employer ATS servers."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/resume/builder" />}>
              <Pencil className="mr-2 h-4 w-4" />
              Open builder
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate(file);
                e.target.value = "";
              }}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={uploadMutation.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? "Analyzing..." : "Upload Resume"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{versions.length}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading && <TableSkeleton rows={3} />}
      {error && (
        <EmptyState title="Could not load resumes" description={(error as Error).message} />
      )}
      {!isLoading && !error && resumes.length === 0 && (
        <EmptyState
          icon="file"
          title="No resumes yet"
          description="Upload a PDF/DOCX, or start from blank in the structured builder."
          action={{ label: "Upload Resume", onClick: () => inputRef.current?.click() }}
        />
      )}

      {resumes.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your uploads</CardTitle>
              <CardDescription>Select a resume to review ATS breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {resumes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(r.id);
                    setPreviewMarkdown("");
                  }}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    activeId === r.id ? "border-primary bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <div>
                    <div className="font-medium">{r.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()} · score {r.aiScore ?? "—"}
                    </div>
                  </div>
                  <StatusBadge
                    status={
                      r.status === "parsed" ? "active" : r.status === "failed" ? "rejected" : "pending"
                    }
                  >
                    {r.status}
                  </StatusBadge>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-3">
            {selected && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Readiness {scorecard?.overall ?? selected.aiScore ?? "—"}/100
                      </CardTitle>
                      <CardDescription>{selected.fileName}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/resume/builder?id=${selected.id}`} />}
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => improveMutation.mutate()}
                        disabled={improveMutation.isPending}
                      >
                        <Wand2 className="mr-1 h-4 w-4" />
                        {improveMutation.isPending ? "Generating..." : "Generate improved"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {scorecard && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">ATS-style scorecard</h4>
                        <p className="text-xs text-muted-foreground">
                          CareerOS rules score — not a live Workday / Naukri / LinkedIn ATS pass.
                          Weighted: parse 20% · keywords 25% · impact 25% · format 10% · completeness
                          20%. Useful for coaching; not a guarantee any employer parser will score
                          the same.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <ScoreBar label="Parse" value={scorecard.parse} />
                          <ScoreBar label="Keywords" value={scorecard.keywords} />
                          <ScoreBar label="Impact" value={scorecard.impact} />
                          <ScoreBar label="Format" value={scorecard.format} />
                          <ScoreBar label="Completeness" value={scorecard.completeness} />
                        </div>
                        <ul className="space-y-2">
                          {scorecard.checks.map((c) => (
                            <li
                              key={c.id}
                              className="flex gap-2 rounded-lg border px-3 py-2 text-sm"
                            >
                              {c.passed ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                              ) : (
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                              )}
                              <div>
                                <div className="font-medium">
                                  {c.label}{" "}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    · {c.category}
                                  </span>
                                </div>
                                {!c.passed && (
                                  <p className="text-muted-foreground">{c.hint}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {keywordGap && (
                      <div className="space-y-2 rounded-lg border p-3">
                        <h4 className="text-sm font-semibold">
                          JD keyword gap — {keywordGap.coveragePercent}% coverage
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Matched: {keywordGap.matched.slice(0, 10).join(", ") || "none"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Missing: {keywordGap.missing.slice(0, 12).join(", ") || "none"}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">Suggestions</h4>
                      {suggestions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No suggestions yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {suggestions.map((s) => (
                            <li key={s.id} className="rounded-lg border p-3 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{s.title}</span>
                                <StatusBadge
                                  status={
                                    s.severity === "high"
                                      ? "rejected"
                                      : s.severity === "medium"
                                        ? "interview"
                                        : "pending"
                                  }
                                >
                                  {s.severity}
                                </StatusBadge>
                              </div>
                              <p className="mt-1 text-muted-foreground">{s.detail}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Target JD (optional keyword gap)</h4>
                      <Textarea
                        placeholder="Paste a job description to compare keywords…"
                        value={targetJd}
                        onChange={(e) => setTargetJd(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Paste text fallback</h4>
                      <Textarea
                        placeholder="If PDF extract failed (scanned), paste resume text…"
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        rows={4}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reanalyzeMutation.mutate()}
                        disabled={reanalyzeMutation.isPending}
                      >
                        {reanalyzeMutation.isPending ? "Analyzing…" : "Re-analyze + ATS"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Optimize for a job</h4>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                          className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm"
                          value={jobId}
                          onChange={(e) => setJobId(e.target.value)}
                        >
                          <option value="">Select beachhead job…</option>
                          {jobs.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.title} — {j.company}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!jobId || tailorMutation.isPending}
                          onClick={() => tailorMutation.mutate()}
                        >
                          {tailorMutation.isPending ? "Tailoring..." : "Tailor + cover letter"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Version history</CardTitle>
                    <CardDescription>Improved, drafts, and job-tailored outputs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {versions.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No versions yet. Click Generate improved or save from the builder.
                      </p>
                    )}
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium">{v.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {v.kind} · score {v.aiScore ?? "—"} ·{" "}
                            {new Date(v.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => showPreview(v.contentMarkdown, v.name)}
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadMarkdown(v.contentMarkdown, `${v.name}.md`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {previewMarkdown && (
                  <Card ref={previewRef}>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                      <div>
                        <CardTitle>ATS resume preview</CardTitle>
                        <CardDescription>
                          Structured draft for download / builder — not submitted to any employer ATS.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          render={<Link href={`/resume/builder?id=${selected.id}`} />}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit in builder
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadMarkdown(previewMarkdown, "careeros-ats-resume.md")}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Download .md
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <MarkdownResumePreview markdown={previewMarkdown} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
