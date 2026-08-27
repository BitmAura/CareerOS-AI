"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardPaste, ListChecks, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state/EmptyState";
import { StatusBadge } from "@/components/shared/status-badge/StatusBadge";
import { api, ApiError } from "@/lib/api";
import type { ApplicationQueueItem, DigestRunRecord, ResumeRecord } from "@/lib/db/types";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { formatDisplayDate } from "@/lib/format";

type EnginesResponse = {
  jobUrlExtract?: { primary?: string };
  engines?: Array<{ id: string; configured?: boolean; name?: string }>;
};

type QueueResponse = {
  date: string;
  items: ApplicationQueueItem[];
  runs?: DigestRunRecord[];
  runsUsed?: number;
  runsRemaining?: number;
  seatsUsed?: number;
  seatsRemaining?: number;
  nextSlotLabel?: string;
  canRunDigest?: boolean;
};

export default function DailyQueuePage() {
  const queryClient = useQueryClient();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [paste, setPaste] = useState({
    title: "",
    company: "",
    applyUrl: "",
    description: "",
  });
  const [winPanel, setWinPanel] = useState("");

  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => api<ResumeRecord[]>("/resume"),
  });

  const { data: targetsInfo } = useQuery({
    queryKey: ["career-targets"],
    queryFn: () => api<{ targets: { targetRole: string; cities: string[] }; ready: boolean }>("/profile/targets"),
  });

  const { data: enginesInfo } = useQuery({
    queryKey: ["engines"],
    queryFn: () => api<EnginesResponse>("/engines"),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["queue"],
    queryFn: () => api<QueueResponse>("/queue"),
  });

  const items = data?.items || [];
  const preview = items.find((i) => i.id === previewId) || null;
  const runsUsed = data?.runsUsed ?? 0;
  const runsRemaining = data?.runsRemaining ?? PRODUCT_STANCE.dailyDigestRunsMax;
  const seatsRemaining = data?.seatsRemaining ?? PRODUCT_STANCE.dailyQueueCap;

  const digestMutation = useMutation({
    mutationFn: () =>
      api<{
        created: number;
        items: ApplicationQueueItem[];
        slotLabel?: string;
        message?: string;
        live?: {
          searched?: boolean;
          hits?: number;
          fetched?: number;
          blocked?: number;
          failed?: number;
        };
        sources?: { live: number; beachhead: number };
      }>("/queue", {
        method: "POST",
        body: {
          action: "digest",
          autoPrepare: true,
          resumeId: resumes[0]?.id,
        },
      }),
    onSuccess: (res) => {
      if (res.message && res.created === 0) toast.message(res.message);
      else {
        const liveBit =
          res.sources?.live != null
            ? ` · live ${res.sources.live} / seeds ${res.sources.beachhead}`
            : "";
        toast.success(
          `${res.slotLabel || "Search"}: queued ${res.created} match${res.created === 1 ? "" : "es"}${liveBit}`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["hunt-today"] });
    },
    onError: (e: Error) =>
      toast.error(e instanceof ApiError ? e.message : e.message || "Digest failed"),
  });

  const liveCheckMutation = useMutation({
    mutationFn: (url: string) =>
      api<{ live?: boolean; checked?: boolean; blocked?: boolean; message?: string }>("/jobs/liveness", {
        method: "POST",
        body: { url },
      }),
    onSuccess: (res) => {
      if (res.message) toast.message(res.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api<{
        item: ApplicationQueueItem;
        applyUrl?: string | null;
        liveness?: { live?: boolean; checked?: boolean; blocked?: boolean } | null;
      }>(`/queue/${id}`, {
        method: "POST",
        body: { action },
      }),
    onSuccess: (res, vars) => {
      if (vars.action === "approve" || vars.action === "open_careers") {
        const url = res.applyUrl || preview?.applyUrl || preview?.job?.sourceUrl;
        if (res.liveness?.checked && res.liveness.live === false) {
          toast.message("This posting may be closed — confirm on the careers page before spending a packet.");
        }
        if (url && !res.liveness?.blocked) {
          window.open(url, "_blank", "noopener,noreferrer");
          toast.success("Opened employer careers — submit their form, then tap “I submitted”");
        } else if (!url) {
          toast.success("Logged as Opened — no URL; apply on the company site, then confirm submit");
        } else {
          toast.message("Login-wall boards are not opened by CareerOS — paste the JD or apply on the employer site.");
        }
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["hunt-today"] });
      } else if (vars.action === "confirm_submitted") {
        toast.success("Marked submitted — tracked in Applications as Applied");
        queryClient.invalidateQueries({ queryKey: ["applications"] });
        queryClient.invalidateQueries({ queryKey: ["value-stats"] });
        queryClient.invalidateQueries({ queryKey: ["hunt-today"] });
      } else if (vars.action === "dismiss") {
        toast.message("Dismissed from queue");
      } else {
        toast.success("Packet prepared");
      }
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pasteMutation = useMutation({
    mutationFn: () =>
      api<{ item: ApplicationQueueItem }>("/queue", {
        method: "POST",
        body: { action: "paste", ...paste },
      }),
    onSuccess: () => {
      toast.success("Pasted job added to today’s queue");
      setPaste({ title: "", company: "", applyUrl: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const extractUrlMutation = useMutation({
    mutationFn: () =>
      api<{ item: ApplicationQueueItem; engine?: string }>("/queue", {
        method: "POST",
        body: { action: "extract_url", applyUrl: paste.applyUrl },
      }),
    onSuccess: (res) => {
      toast.success(
        res.engine === "tinyfish"
          ? "Job pulled via TinyFish → queued"
          : "Job pulled from public careers URL → queued",
      );
      setPaste({ title: "", company: "", applyUrl: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alertIngestMutation = useMutation({
    mutationFn: () =>
      api<{ item: ApplicationQueueItem; alertIngest?: { hint?: string } }>("/queue", {
        method: "POST",
        body: {
          action: "ingest_alert",
          text: paste.description || paste.applyUrl,
          title: paste.title,
          company: paste.company,
        },
      }),
    onSuccess: (res) => {
      toast.success(res.alertIngest?.hint || "Alert / links ingested → queued");
      setPaste({ title: "", company: "", applyUrl: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const winKitMutation = useMutation({
    mutationFn: (mode: "apply_assist" | "outreach" | "interview_stories" | "negotiate") =>
      api<{
        applyAssist?: {
          knockouts: Array<{ question: string; suggestion: string; risk: string }>;
          formAnswers: Array<{ prompt: string; answer: string }>;
          honestyNote: string;
        };
        outreach?: { body: string };
        stories?: Array<{ title: string; situation: string; task: string; action: string; result: string; reflection: string }>;
        negotiation?: { opener: string; pushback: string; walkaway: string; targetLpa?: number };
        honesty?: string;
      }>("/ai/win-kit", {
        method: "POST",
        body: { mode, queueId: previewId },
      }),
    onSuccess: (res, mode) => {
      if (mode === "apply_assist" && res.applyAssist) {
        const ko = res.applyAssist.knockouts
          .map((k) => `⚠ ${k.question}: ${k.suggestion}`)
          .join("\n");
        const answers = res.applyAssist.formAnswers
          .map((a) => `${a.prompt}\n${a.answer}`)
          .join("\n\n");
        toast.message(res.applyAssist.honestyNote);
        setWinPanel([ko, answers].filter(Boolean).join("\n\n"));
      } else if (mode === "outreach" && res.outreach) {
        setWinPanel(res.outreach.body);
        toast.success("LinkedIn note draft ready (copy — we never send)");
      } else if (mode === "interview_stories" && res.stories?.length) {
        setWinPanel(
          res.stories
            .map(
              (s) =>
                `${s.title}\nS: ${s.situation}\nT: ${s.task}\nA: ${s.action}\nR: ${s.result}\n+: ${s.reflection}`,
            )
            .join("\n\n"),
        );
        toast.success("STAR stories ready");
      } else if (mode === "negotiate" && res.negotiation) {
        setWinPanel(
          `Opener:\n${res.negotiation.opener}\n\nPushback:\n${res.negotiation.pushback}\n\nWalk-away:\n${res.negotiation.walkaway}`,
        );
        toast.success("CTC negotiation script ready");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadPacket(format: "html" | "pdf") {
    if (!previewId) return;
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("careeros_token") || localStorage.getItem("token")
          : null;
      const res = await fetch(`/api/queue/${previewId}/packet?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (format === "html") {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.success("Packet opened — use Print → Save as PDF for ATS upload");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `careeros-packet.${format}`;
        a.click();
        toast.success("PDF downloaded (text ATS packet)");
      }
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Packet export failed");
    }
  }

  const pending = items.filter(
    (i) => i.status === "queued" || i.status === "prepared" || i.status === "opened",
  );
  const done = items.filter((i) => i.status === "approved" || i.status === "dismissed");
  const seatsUsed = data?.seatsUsed ?? items.length;
  const confirmedToday = items.filter((i) => i.status === "approved").length;
  const openedToday = items.filter((i) => i.status === "opened").length;
  const canRun = data?.canRunDigest !== false && runsRemaining > 0 && seatsRemaining > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily apply queue"
        description="Up to 3 searches/day · 15 seats. You submit on the employer site."
        action={
          <Button
            onClick={() => digestMutation.mutate()}
            disabled={digestMutation.isPending || !canRun}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {digestMutation.isPending
              ? "Searching…"
              : canRun
                ? `Run ${data?.nextSlotLabel || "next search"} (${runsRemaining} left)`
                : "Daily limit reached"}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Digest date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold leading-tight sm:text-2xl">
              {formatDisplayDate(data?.date)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">UTC calendar day for caps</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Searches today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {runsUsed}/{PRODUCT_STANCE.dailyDigestRunsMax}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              +1 each time you run Morning / Midday / Evening search (paste JD does not count)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Queue seats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {seatsUsed}/{PRODUCT_STANCE.dailyQueueCap}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              All seats used today (open {pending.length} · closed {done.length}). Cap includes
              approved/dismissed.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed submits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmedToday}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              You marked submitted · {openedToday} opened (not counted as submit)
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        OEM Workday + Greenhouse first. LinkedIn/Naukri are never scraped — paste the JD instead.
      </p>

      {targetsInfo && !targetsInfo.ready && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          Set your career targets (role, years, cities) so matches grade against what you want.{" "}
          <Link href="/profile" className="font-medium underline">
            Open profile
          </Link>
        </div>
      )}
      {targetsInfo?.ready && (
        <p className="text-sm text-muted-foreground">
          Hunting as{" "}
          <span className="font-medium text-foreground">
            {targetsInfo.targets.targetRole || "your target role"}
          </span>
          {targetsInfo.targets.cities?.length
            ? ` · ${targetsInfo.targets.cities.join(", ")}`
            : ""}{" "}
          · up to {PRODUCT_STANCE.dailyQueueCap} confirmed seats/day ·{" "}
          <Link href="/profile" className="underline">
            edit
          </Link>
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardPaste className="h-4 w-4" />
            Paste Naukri / LinkedIn alert / career-page JD
          </CardTitle>
          <CardDescription>
            Public careers URL (Greenhouse / Lever / Ashby / company careers):{" "}
            {enginesInfo?.jobUrlExtract?.primary === "tinyfish"
              ? "TinyFish Fetch scrapes the live page"
              : "native fetch (add TINYFISH_API_KEY for JS-rendered pages)"}
            . Or paste a LinkedIn/Naukri job-alert email — we pull links, never log into LinkedIn.
            Adds one queue seat (does not use a search credit).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder="Job title"
            value={paste.title}
            onChange={(e) => setPaste({ ...paste, title: e.target.value })}
          />
          <Input
            placeholder="Company"
            value={paste.company}
            onChange={(e) => setPaste({ ...paste, company: e.target.value })}
          />
          <Input
            className="md:col-span-2"
            placeholder="Public job URL (Greenhouse / Lever / Ashby / careers page)"
            value={paste.applyUrl}
            onChange={(e) => setPaste({ ...paste, applyUrl: e.target.value })}
          />
          <Textarea
            className="md:col-span-2"
            rows={4}
            placeholder="Paste full JD — or forward/paste a LinkedIn / Naukri job alert email…"
            value={paste.description}
            onChange={(e) => setPaste({ ...paste, description: e.target.value })}
          />
          <Button
            variant="secondary"
            disabled={!paste.applyUrl.trim() || extractUrlMutation.isPending}
            onClick={() => extractUrlMutation.mutate()}
          >
            {extractUrlMutation.isPending ? "Fetching…" : "Fetch from URL"}
          </Button>
          <Button
            variant="secondary"
            disabled={
              (!paste.description.trim() && !paste.applyUrl.trim()) ||
              alertIngestMutation.isPending
            }
            onClick={() => alertIngestMutation.mutate()}
          >
            {alertIngestMutation.isPending ? "Ingesting…" : "Ingest alert / links"}
          </Button>
          <Button
            className="md:col-span-2"
            disabled={!paste.description.trim() || pasteMutation.isPending}
            onClick={() => pasteMutation.mutate()}
          >
            Add pasted JD
          </Button>
        </CardContent>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading queue…</p>}
      {error && <EmptyState title="Queue error" description={(error as Error).message} />}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon="inbox"
          title="No matches queued today"
          description="Run Morning / Midday / Evening search (3×/day) against beachhead roles matched to your resume, or paste a JD."
          action={{
            label: canRun ? "Run search" : "Limit reached",
            onClick: () => canRun && digestMutation.mutate(),
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4" />
              Review queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreviewId(item.id)}
                className={`flex w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left text-sm ${
                  previewId === item.id ? "border-primary bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {item.job?.title || "Role"} — {item.job?.company}
                  </span>
                  <StatusBadge
                    status={
                      item.status === "approved"
                        ? "applied"
                        : item.status === "opened"
                          ? "shortlisted"
                          : item.status === "prepared"
                            ? "interview"
                            : item.status === "dismissed"
                              ? "rejected"
                              : "pending"
                    }
                  >
                    {item.status}
                  </StatusBadge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.matchRubric ? (
                    <>
                      Grade {item.matchRubric.grade} · {item.matchScore}% ·{" "}
                      {"★".repeat(item.matchRubric.stars)}
                      {"☆".repeat(5 - item.matchRubric.stars)}
                    </>
                  ) : (
                    <>Match {item.matchScore}%</>
                  )}
                  {item.job?.location ? ` · ${item.job.location}` : ""}
                  {item.digestSlot ? ` · ${item.digestSlot}` : ""}
                  {item.job?.sourceKind
                    ? ` · ${item.job.sourceKind}`
                    : item.job?.source
                      ? ` · ${item.job.source}`
                      : ""}
                </div>
                {item.matchRubric?.why?.[0] && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{item.matchRubric.why[0]}</p>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {preview ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {preview.job?.title} @ {preview.job?.company}
                </CardTitle>
                <CardDescription>
                  {preview.job?.location}
                  {preview.matchRubric
                    ? ` · Grade ${preview.matchRubric.grade} (${preview.matchScore}%)`
                    : ` · match ${preview.matchScore}%`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {preview.matchRubric && (
                  <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="font-medium">
                      Why this job · Grade {preview.matchRubric.grade} ·{" "}
                      {"★".repeat(preview.matchRubric.stars)}
                      {"☆".repeat(5 - preview.matchRubric.stars)}
                    </div>
                    <ul className="list-inside list-disc text-muted-foreground">
                      {preview.matchRubric.why.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                    {preview.matchRubric.gaps.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Gaps to cover: {preview.matchRubric.gaps.join("; ")}
                      </p>
                    )}
                    {(preview.matchRubric as { unknowns?: string[] }).unknowns?.length ? (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Unknown in JD:{" "}
                        {(preview.matchRubric as { unknowns?: string[] }).unknowns!.join("; ")}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {preview.job?.salary && <span>CTC: {preview.job.salary}</span>}
                      {preview.job?.noticeDays != null && (
                        <span>Notice in JD: {preview.job.noticeDays}d</span>
                      )}
                      {preview.job?.postedAt && <span>Posted: {preview.job.postedAt}</span>}
                      {preview.job?.sourceLabel ? (
                        <span>
                          Found on: {preview.job.sourceLabel}
                          {preview.job.sourceOfficial ? " · official source" : ""}
                        </span>
                      ) : preview.job?.sourceKind ? (
                        <span>Source: {preview.job.sourceKind}</span>
                      ) : null}
                      {preview.job?.discoveredAt && (
                        <span>
                          Found by CareerOS:{" "}
                          {new Date(preview.job.discoveredAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium">{preview.matchRubric.action}</p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{preview.job?.description}</p>
                <div className="flex flex-wrap gap-2">
                  {preview.status === "queued" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ id: preview.id, action: "prepare" })}
                    >
                      Prepare packet
                    </Button>
                  )}
                  {(preview.status === "prepared" ||
                    preview.status === "queued" ||
                    preview.status === "opened") && (
                    <Button
                      size="sm"
                      disabled={actionMutation.isPending}
                      onClick={() =>
                        actionMutation.mutate({ id: preview.id, action: "open_careers" })
                      }
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Open careers site
                    </Button>
                  )}
                  {(preview.applyUrl || preview.job?.sourceUrl) ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={liveCheckMutation.isPending}
                      onClick={() =>
                        liveCheckMutation.mutate(preview.applyUrl || preview.job?.sourceUrl || "")
                      }
                    >
                      Check if posting is live
                    </Button>
                  ) : (
                    <p className="w-full text-xs text-muted-foreground">
                      No public job URL on this seat. Paste a careers link in the box above, or
                      open the company site yourself.
                    </p>
                  )}
                  {(preview.status === "opened" || preview.status === "approved") && (
                    <Button
                      size="sm"
                      disabled={actionMutation.isPending || preview.status === "approved"}
                      onClick={() =>
                        actionMutation.mutate({ id: preview.id, action: "confirm_submitted" })
                      }
                    >
                      I submitted on employer site
                    </Button>
                  )}
                  {(preview.status === "prepared" || preview.tailoredMarkdown) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => downloadPacket("html")}>
                        Print / PDF packet
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadPacket("pdf")}>
                        Download text PDF
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!previewId || winKitMutation.isPending}
                    onClick={() => winKitMutation.mutate("apply_assist")}
                  >
                    Apply-assist answers
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!previewId || winKitMutation.isPending}
                    onClick={() => winKitMutation.mutate("outreach")}
                  >
                    LinkedIn note draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!previewId || winKitMutation.isPending}
                    onClick={() => winKitMutation.mutate("interview_stories")}
                  >
                    STAR stories
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={winKitMutation.isPending}
                    onClick={() => winKitMutation.mutate("negotiate")}
                  >
                    CTC negotiate
                  </Button>
                  {(preview.applyUrl || preview.job?.sourceUrl) && (
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <a
                          href={preview.applyUrl || preview.job?.sourceUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      Open original posting
                    </Button>
                  )}
                  {preview.status !== "dismissed" && preview.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionMutation.isPending}
                      onClick={() => actionMutation.mutate({ id: preview.id, action: "dismiss" })}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Dismiss
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" render={<Link href="/applications" />}>
                    Open tracker
                  </Button>
                </div>

                {winPanel && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Win kit draft (copy only)</h4>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
                      {winPanel}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1"
                      onClick={() => {
                        void navigator.clipboard.writeText(winPanel);
                        toast.success("Copied");
                      }}
                    >
                      Copy draft
                    </Button>
                  </div>
                )}

                {preview.coverLetter && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Cover letter (prepared)</h4>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
                      {preview.coverLetter}
                    </pre>
                  </div>
                )}
                {preview.tailoredMarkdown && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold">Tailored resume (prepared)</h4>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs">
                      {preview.tailoredMarkdown}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="Select a match"
              description="Prepare a packet, open the employer careers site, then tap “I submitted” only after you finish their form. CareerOS never auto-submits."
            />
          )}

          {done.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Closed today: {done.map((d) => `${d.job?.company} (${d.status})`).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
