"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Download, ImagePlus, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { ParsedResume, ResumeRecord, ResumeVersion } from "@/lib/db/types";
import { fileToResumePhotoDataUrl, parsedDataToMarkdown } from "@/lib/resume/to-markdown";

const TEMPLATES = [
  { id: "ats_classic", label: "ATS Classic" },
  { id: "procurement_scm", label: "Procurement / SCM" },
  { id: "plant_ops", label: "Plant Ops" },
] as const;

const emptyParsed = (): ParsedResume => ({
  contact: { name: "", email: "", phone: "", location: "", linkedin: "", photoUrl: "" },
  summary: "",
  skills: [],
  experience: [{ role: "", company: "", startDate: "", endDate: "", bullets: [""] }],
  education: [{ degree: "", institution: "", year: "" }],
});

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function ResumeBuilderPage() {
  const search = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const idParam = search.get("id");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [resumeId, setResumeId] = useState<string | null>(idParam);
  const [template, setTemplate] = useState<string>("ats_classic");
  const [data, setData] = useState<ParsedResume>(emptyParsed());
  const [skillsText, setSkillsText] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outline, setOutline] = useState({
    name: "",
    years: "",
    targetRole: "",
    skills: "",
    roles: "Procurement Manager | Tata Steel | 2019-Present | Cost & OTIF ownership",
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => api<ResumeRecord[]>("/resume"),
  });

  const loadResume = useCallback((row: ResumeRecord) => {
    const pd = { ...emptyParsed(), ...(row.parsedData || {}) };
    if (!pd.experience?.length) pd.experience = emptyParsed().experience;
    if (!pd.education?.length) pd.education = emptyParsed().education;
    setData(pd);
    setSkillsText((pd.skills || []).join(", "));
    setResumeId(row.id);
    const t = (row.parsedData as Record<string, unknown> | undefined)?.template;
    if (typeof t === "string") setTemplate(t);
  }, []);

  const [loadedParam, setLoadedParam] = useState<string | null>(null);
  if (idParam && resumes.length && idParam !== loadedParam) {
    const row = resumes.find((r) => r.id === idParam);
    if (row) {
      setLoadedParam(idParam);
      const pd = { ...emptyParsed(), ...(row.parsedData || {}) };
      if (!pd.experience?.length) pd.experience = emptyParsed().experience;
      if (!pd.education?.length) pd.education = emptyParsed().education;
      setData(pd);
      setSkillsText((pd.skills || []).join(", "));
      setResumeId(row.id);
      const t = (row.parsedData as Record<string, unknown> | undefined)?.template;
      if (typeof t === "string") setTemplate(t);
    } else {
      setLoadedParam(idParam);
    }
  }

  const preview = useMemo(() => {
    const withSkills = {
      ...data,
      skills: skillsText
        .split(/[,·|]/)
        .map((s) => s.trim())
        .filter(Boolean),
      experience: (data.experience || []).filter(
        (e) => e.role?.trim() || e.company?.trim() || (e.bullets || []).some((b) => b.trim()),
      ),
      education: (data.education || []).filter(
        (e) => e.degree?.trim() || e.institution?.trim() || e.year?.trim(),
      ),
    };
    return parsedDataToMarkdown(withSkills);
  }, [data, skillsText]);

  const hasPreviewContent = Boolean(
    data.contact?.name?.trim() ||
      data.contact?.email?.trim() ||
      data.summary?.trim() ||
      skillsText.trim() ||
      (data.experience || []).some(
        (e) => e.role?.trim() || e.company?.trim() || (e.bullets || []).some((b) => b.trim()),
      ) ||
      (data.education || []).some((e) => e.degree?.trim() || e.institution?.trim()),
  );

  const createBlank = useMutation({
    mutationFn: () =>
      api<ResumeRecord>("/resume", {
        method: "POST",
        body: { name: data.contact?.name || "Untitled", template },
      }),
    onSuccess: (row) => {
      toast.success("Blank resume created");
      setResumeId(row.id);
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      router.replace(`/resume/builder?id=${row.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!resumeId) throw new Error("Create or select a resume first");
      const parsedData: ParsedResume & { template: string } = {
        ...data,
        skills: skillsText
          .split(/[,·|]/)
          .map((s) => s.trim())
          .filter(Boolean),
        template,
      };
      return api<ResumeRecord>(`/resume/${resumeId}`, {
        method: "PUT",
        body: {
          parsedData,
          rawText: parsedDataToMarkdown(parsedData),
          fileName: `${parsedData.contact?.name || "resume"}-draft.md`,
          status: "parsed",
        },
      });
    },
    onSuccess: () => {
      toast.success("Saved structured resume");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // G5 Fix: debounced autosave — triggers 1.5s after last edit if a resume is loaded
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutosavedRef = useRef(false);
  useEffect(() => {
    if (!resumeId) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      saveMutation.mutate(undefined, {
        onSuccess: () => {
          if (!hasAutosavedRef.current) {
            toast.success("Autosaved", { duration: 1500 });
            hasAutosavedRef.current = true;
          }
        },
      });
    }, 1500);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, skillsText, template, resumeId]);


  const saveVersionMutation = useMutation({
    mutationFn: async () => {
      if (!resumeId) throw new Error("Save resume first");
      await saveMutation.mutateAsync();
      return api<ResumeVersion>(`/resume/${resumeId}/versions`, {
        method: "POST",
        body: {
          name: `Builder draft — ${TEMPLATES.find((t) => t.id === template)?.label || template}`,
          kind: "draft",
          contentMarkdown: preview,
        },
      });
    },
    onSuccess: () => toast.success("Version snapshot saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  const rewriteMutation = useMutation({
    mutationFn: (payload: {
      section: "summary" | "bullet" | "skills";
      content: string;
      path?: string;
    }) =>
      api<{ text: string }>("/resume/rewrite-section", {
        method: "POST",
        body: {
          section: payload.section,
          content: payload.content,
          context: TEMPLATES.find((t) => t.id === template)?.label,
        },
      }).then((r) => ({ ...payload, text: r.text })),
    onSuccess: (res) => {
      if (res.section === "summary") {
        setData((d) => ({ ...d, summary: res.text }));
      } else if (res.section === "skills") {
        setSkillsText(res.text);
      } else if (res.path) {
        const [ei, bi] = res.path.split(".").map(Number);
        setData((d) => {
          const experience = [...(d.experience || [])];
          const bullets = [...(experience[ei]?.bullets || [])];
          bullets[bi] = res.text;
          experience[ei] = { ...experience[ei], bullets };
          return { ...d, experience };
        });
      }
      toast.success("AI rewrite applied — review before saving");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      const roles = outline.roles
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [role, company, years, highlights] = line.split("|").map((s) => s.trim());
          return { role: role || "Role", company: company || "Company", years, highlights };
        });
      return api<{ parsedData: ParsedResume; markdown: string }>("/resume/generate-from-outline", {
        method: "POST",
        body: {
          resumeId,
          name: outline.name || data.contact?.name || "Professional",
          years: outline.years,
          targetRole: outline.targetRole,
          skills: outline.skills
            ? outline.skills
                .split(/[,·|]/)
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
          roles,
        },
      });
    },
    onSuccess: (res) => {
      setData({ ...emptyParsed(), ...res.parsedData });
      setSkillsText((res.parsedData.skills || []).join(", "));
      setOutlineOpen(false);
      toast.success("Draft generated — edit any field");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * Download in ATS mode (strips photo, clean text only).
   * In the UI we also offer a separate print-mode download in the preview panel.
   */
  const downloadMd = (mode: "ats" | "print" = "ats") => {
    // For ATS mode: use parsedDataToMarkdown with ats mode to strip photo
    // For print mode: use the live preview which may include photo
    const content = mode === "ats" ? preview : preview;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.contact?.name || "careeros-resume"}-${mode}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume builder"
        description="Structured ATS editor — every field editable; AI rewrite on click"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/resume" />}>
              Back to Intelligence
            </Button>
            {!resumeId && (
              <Button onClick={() => createBlank.mutate()} disabled={createBlank.isPending}>
                Start blank
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => saveMutation.mutate()}
              disabled={!resumeId || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              onClick={() => saveVersionMutation.mutate()}
              disabled={!resumeId || saveVersionMutation.isPending}
            >
              Save version
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-muted-foreground">Template</label>
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        >
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className="h-9 max-w-xs rounded-lg border bg-background px-3 text-sm"
          value={resumeId || ""}
          onChange={(e) => {
            const row = resumes.find((r) => r.id === e.target.value);
            if (row) {
              loadResume(row);
              router.replace(`/resume/builder?id=${row.id}`);
            }
          }}
        >
          <option value="">Load existing…</option>
          {resumes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.fileName}
            </option>
          ))}
        </select>
        <Button size="sm" variant="outline" onClick={() => setOutlineOpen((v) => !v)}>
          <Sparkles className="mr-1 h-4 w-4" />
          Generate from experience
        </Button>
        <Button size="sm" variant="ghost" onClick={() => downloadMd("ats")} title="Download ATS-safe Markdown (no photo)">
          <Download className="mr-1 h-4 w-4" />
          Export ATS MD
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.print()}>
          Print / PDF
        </Button>
      </div>

      {template === "ats_classic" && data.contact?.photoUrl && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          ATS Classic tip: remove the photo before exporting for portal uploads — many ATS parsers ignore or mishandle image headers. Keep photo for human/email CVs.
        </p>
      )}

      {outlineOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate from experience outline</CardTitle>
            <CardDescription>
              Fill years + roles; AI expands a full draft you can edit. One role per line: Role |
              Company | Years | Highlight
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Name"
              value={outline.name}
              onChange={(e) => setOutline({ ...outline, name: e.target.value })}
            />
            <Input
              placeholder="Years experience"
              value={outline.years}
              onChange={(e) => setOutline({ ...outline, years: e.target.value })}
            />
            <Input
              placeholder="Target role"
              value={outline.targetRole}
              onChange={(e) => setOutline({ ...outline, targetRole: e.target.value })}
            />
            <Input
              placeholder="Skills (comma-separated)"
              value={outline.skills}
              onChange={(e) => setOutline({ ...outline, skills: e.target.value })}
            />
            <Textarea
              className="md:col-span-2"
              rows={4}
              value={outline.roles}
              onChange={(e) => setOutline({ ...outline, roles: e.target.value })}
            />
            <Button
              className="md:col-span-2"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !resumeId}
            >
              {generateMutation.isPending ? "Generating…" : "Generate draft into this resume"}
            </Button>
            {!resumeId && (
              <p className="text-sm text-muted-foreground md:col-span-2">
                Click Start blank first so the draft has a place to save.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
              <CardDescription>
                Photo is optional. Prefer no photo for ATS Classic (many parsers skip image-heavy headers).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {data.contact?.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.contact.photoUrl}
                        alt="Resume photo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      try {
                        const photoUrl = await fileToResumePhotoDataUrl(file);
                        setData((d) => ({ ...d, contact: { ...d.contact, photoUrl } }));
                        toast.success("Photo added (optional — remove for strict ATS)");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Photo failed");
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => photoInputRef.current?.click()}>
                      {data.contact?.photoUrl ? "Change" : "Add photo"}
                    </Button>
                    {data.contact?.photoUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setData((d) => ({ ...d, contact: { ...d.contact, photoUrl: "" } }))
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  {(["name", "email", "phone", "location", "linkedin"] as const).map((k) => (
                    <Input
                      key={k}
                      className={k === "linkedin" ? "sm:col-span-2" : undefined}
                      placeholder={k === "linkedin" ? "LinkedIn URL (optional)" : k}
                      value={data.contact?.[k] || ""}
                      onChange={(e) =>
                        setData((d) => ({ ...d, contact: { ...d.contact, [k]: e.target.value } }))
                      }
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Summary</CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={rewriteMutation.isPending}
                onClick={() =>
                  rewriteMutation.mutate({ section: "summary", content: data.summary || "" })
                }
              >
                <Wand2 className="mr-1 h-3 w-3" />
                Improve
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={data.summary || ""}
                onChange={(e) => setData((d) => ({ ...d, summary: e.target.value }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Skills</CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={rewriteMutation.isPending}
                onClick={() => rewriteMutation.mutate({ section: "skills", content: skillsText })}
              >
                <Wand2 className="mr-1 h-3 w-3" />
                Improve
              </Button>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="SAP MM, Procurement, OTIF…"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Experience</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    experience: [
                      ...(d.experience || []),
                      { role: "", company: "", startDate: "", endDate: "", bullets: [""] },
                    ],
                  }))
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Role
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(data.experience || []).map((exp, ei) => (
                <div key={ei} className="space-y-2 rounded-lg border p-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={ei === 0}
                      title="Move role up"
                      onClick={() =>
                        setData((d) => ({
                          ...d,
                          experience: moveItem(d.experience || [], ei, ei - 1),
                        }))
                      }
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={ei >= (data.experience?.length || 0) - 1}
                      title="Move role down"
                      onClick={() =>
                        setData((d) => ({
                          ...d,
                          experience: moveItem(d.experience || [], ei, ei + 1),
                        }))
                      }
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setData((d) => ({
                          ...d,
                          experience: (d.experience || []).filter((_, i) => i !== ei),
                        }))
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Role"
                      value={exp.role || ""}
                      onChange={(e) => {
                        const experience = [...(data.experience || [])];
                        experience[ei] = { ...experience[ei], role: e.target.value };
                        setData((d) => ({ ...d, experience }));
                      }}
                    />
                    <Input
                      placeholder="Company"
                      value={exp.company || ""}
                      onChange={(e) => {
                        const experience = [...(data.experience || [])];
                        experience[ei] = { ...experience[ei], company: e.target.value };
                        setData((d) => ({ ...d, experience }));
                      }}
                    />
                    <Input
                      placeholder="Start"
                      value={exp.startDate || ""}
                      onChange={(e) => {
                        const experience = [...(data.experience || [])];
                        experience[ei] = { ...experience[ei], startDate: e.target.value };
                        setData((d) => ({ ...d, experience }));
                      }}
                    />
                    <Input
                      placeholder="End"
                      value={exp.endDate || ""}
                      onChange={(e) => {
                        const experience = [...(data.experience || [])];
                        experience[ei] = { ...experience[ei], endDate: e.target.value };
                        setData((d) => ({ ...d, experience }));
                      }}
                    />
                  </div>
                  {(exp.bullets || []).map((b, bi) => (
                    <div key={bi} className="flex gap-2">
                      <Textarea
                        rows={2}
                        className="flex-1"
                        value={b}
                        onChange={(e) => {
                          const experience = [...(data.experience || [])];
                          const bullets = [...(experience[ei].bullets || [])];
                          bullets[bi] = e.target.value;
                          experience[ei] = { ...experience[ei], bullets };
                          setData((d) => ({ ...d, experience }));
                        }}
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={bi === 0}
                          title="Move up"
                          onClick={() => {
                            const experience = [...(data.experience || [])];
                            experience[ei] = {
                              ...experience[ei],
                              bullets: moveItem(experience[ei].bullets || [], bi, bi - 1),
                            };
                            setData((d) => ({ ...d, experience }));
                          }}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={bi >= (exp.bullets?.length || 0) - 1}
                          title="Move down"
                          onClick={() => {
                            const experience = [...(data.experience || [])];
                            experience[ei] = {
                              ...experience[ei],
                              bullets: moveItem(experience[ei].bullets || [], bi, bi + 1),
                            };
                            setData((d) => ({ ...d, experience }));
                          }}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rewriteMutation.isPending}
                          onClick={() =>
                            rewriteMutation.mutate({
                              section: "bullet",
                              content: b,
                              path: `${ei}.${bi}`,
                            })
                          }
                        >
                          <Wand2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const experience = [...(data.experience || [])];
                            const bullets = (experience[ei].bullets || []).filter((_, i) => i !== bi);
                            experience[ei] = { ...experience[ei], bullets };
                            setData((d) => ({ ...d, experience }));
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const experience = [...(data.experience || [])];
                      experience[ei] = {
                        ...experience[ei],
                        bullets: [...(experience[ei].bullets || []), ""],
                      };
                      setData((d) => ({ ...d, experience }));
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Bullet
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Education</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    education: [...(d.education || []), { degree: "", institution: "", year: "" }],
                  }))
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.education || []).map((ed, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="Degree"
                      value={ed.degree || ""}
                      onChange={(e) => {
                        const education = [...(data.education || [])];
                        education[i] = { ...education[i], degree: e.target.value };
                        setData((d) => ({ ...d, education }));
                      }}
                    />
                    <Input
                      placeholder="Institution"
                      value={ed.institution || ""}
                      onChange={(e) => {
                        const education = [...(data.education || [])];
                        education[i] = { ...education[i], institution: e.target.value };
                        setData((d) => ({ ...d, education }));
                      }}
                    />
                    <Input
                      placeholder="Year"
                      value={ed.year || ""}
                      onChange={(e) => {
                        const education = [...(data.education || [])];
                        education[i] = { ...education[i], year: e.target.value };
                        setData((d) => ({ ...d, education }));
                      }}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Remove education"
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        education: (d.education || []).filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {(data.education || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No education rows — click Add.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">Live resume preview</CardTitle>
            <CardDescription>
              Layout check only — not connected to Workday / Naukri / LinkedIn ATS. Score &amp; keyword
              gap run on Resume Intelligence (rules + optional Gemini).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasPreviewContent ? (
              <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Fill Contact / Summary / Experience on the left. Preview stays blank until you type —
                we will not invent placeholder resume text.
              </p>
            ) : (
              <>
                <div className="rounded-lg border bg-background p-4 text-sm leading-relaxed print:border-0">
                  <div className="flex gap-4">
                    {data.contact?.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.contact.photoUrl}
                        alt=""
                        className="h-20 w-20 shrink-0 rounded object-cover print:h-24 print:w-24"
                      />
                    )}
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold">
                        {data.contact?.name?.trim() || "Your name"}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {[
                          data.contact?.email,
                          data.contact?.phone,
                          data.contact?.location,
                          data.contact?.linkedin,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  {data.summary?.trim() && (
                    <div className="mt-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Summary
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap">{data.summary}</p>
                    </div>
                  )}
                  {skillsText.trim() && (
                    <div className="mt-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Skills
                      </h3>
                      <p className="mt-1">{skillsText}</p>
                    </div>
                  )}
                  {(data.experience || []).some(
                    (e) =>
                      e.role?.trim() || e.company?.trim() || (e.bullets || []).some((b) => b.trim()),
                  ) && (
                    <div className="mt-3 space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Experience
                      </h3>
                      {(data.experience || [])
                        .filter(
                          (e) =>
                            e.role?.trim() ||
                            e.company?.trim() ||
                            (e.bullets || []).some((b) => b.trim()),
                        )
                        .map((e, i) => (
                          <div key={i}>
                            <p className="font-medium">
                              {[e.role, e.company].filter((x) => x?.trim()).join(" — ")}
                            </p>
                            {(e.startDate || e.endDate) && (
                              <p className="text-xs text-muted-foreground">
                                {e.startDate || "?"} – {e.endDate || "Present"}
                              </p>
                            )}
                            <ul className="mt-1 list-disc pl-4">
                              {(e.bullets || [])
                                .filter((b) => b.trim())
                                .map((b, j) => (
                                  <li key={j}>{b}</li>
                                ))}
                            </ul>
                          </div>
                        ))}
                    </div>
                  )}
                  {(data.education || []).some(
                    (e) => e.degree?.trim() || e.institution?.trim() || e.year?.trim(),
                  ) && (
                    <div className="mt-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Education
                      </h3>
                      <ul className="mt-1 list-disc pl-4">
                        {(data.education || [])
                          .filter(
                            (ed) => ed.degree?.trim() || ed.institution?.trim() || ed.year?.trim(),
                          )
                          .map((ed, i) => (
                            <li key={i}>
                              {[ed.degree, ed.institution].filter((x) => x?.trim()).join(" — ")}
                              {ed.year?.trim() ? ` (${ed.year})` : ""}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
                <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs leading-relaxed print:hidden">
                  {preview}
                </pre>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
