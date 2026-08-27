"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Target } from "lucide-react";
import { useAuth } from "@/store/use-auth";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import type { CareerTargets } from "@/lib/db/types";
import { INDUSTRY_PACKS, emptyTargets } from "@/lib/product/targets";

type TargetsResponse = { targets: CareerTargets; ready: boolean };

function ProfilePageInner() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CareerTargets>(emptyTargets());
  const [citiesText, setCitiesText] = useState("");

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["career-targets"],
    queryFn: () => api<TargetsResponse>("/profile/targets"),
    enabled: isAuthenticated,
  });

  const dataKey = data?.targets ? JSON.stringify(data.targets) : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (dataKey && dataKey !== loadedKey && data?.targets) {
    setLoadedKey(dataKey);
    setForm(data.targets);
    setCitiesText((data.targets.cities || []).join(", "));
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      api<TargetsResponse>("/profile/targets", {
        method: "PUT",
        body: {
          targets: {
            ...form,
            cities: citiesText
              .split(/[,|]/)
              .map((c) => c.trim())
              .filter(Boolean),
          },
        },
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["career-targets"], res);
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["profile-targets"] });
      toast.success(
        onboarding
          ? "Targets saved — next: upload your resume"
          : "Career targets saved — daily search will use these",
      );
      if (onboarding) router.push("/resume?onboarding=1");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Save failed"),
  });

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Set hunt targets so CareerOS ranks the right seats for you"
      />

      {onboarding && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 1 of 3 — Career targets</CardTitle>
            <CardDescription>
              Tell us the role, years, cities, CTC, and notice. Then upload resume → run Daily queue.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Career targets
          </CardTitle>
          <CardDescription>
            Drives daily queue ranking and match grades across India. Cities are optional preference —
            we never hide other cities unless you turn relocate off. Example: Regional Sales Manager · 8
            yrs · prefer Pune, Mumbai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Target designation / role</Label>
                  <Input
                    placeholder="Senior Procurement Manager"
                    value={form.targetRole}
                    onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Years of experience</Label>
                  <Input
                    type="number"
                    min={0}
                    max={45}
                    placeholder="8"
                    value={form.yearsExperience || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, yearsExperience: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notice period (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="60"
                    value={form.noticeDays ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        noticeDays: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Preferred cities (optional, comma-separated)</Label>
                  <Input
                    placeholder="e.g. Mumbai, Pune — or leave blank for Pan-India"
                    value={citiesText}
                    onChange={(e) => setCitiesText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Soft preference only. We still show jobs across India; preferred cities rank a bit
                    higher when fit is otherwise equal.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>CTC min (LPA)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="20"
                    value={form.ctcMinLpa ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ctcMinLpa: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTC max (LPA)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="35"
                    value={form.ctcMaxLpa ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ctcMaxLpa: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Industry pack</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.industryPack}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        industryPack: e.target.value as CareerTargets["industryPack"],
                      }))
                    }
                  >
                    {INDUSTRY_PACKS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.openToRelocate !== false}
                    onChange={(e) => setForm((f) => ({ ...f, openToRelocate: e.target.checked }))}
                  />
                  Open across India (recommended) — uncheck only if you want stronger preference for
                  listed cities
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                  Save targets
                </Button>
                <Button variant="outline" render={<Link href="/queue" />}>
                  Open daily queue
                </Button>
                {user?.name && (
                  <span className="text-xs text-muted-foreground">Signed in as {user.name}</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Resume & apply loop
          </CardTitle>
          <CardDescription>
            Keep experience on your resume; targets only steer search. Upload/edit resume, then run
            Morning/Midday/Evening search (max 15 confirmed seats/day).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" render={<Link href="/resume" />}>
            Resume
          </Button>
          <Button variant="secondary" render={<Link href="/resume/builder" />}>
            Builder
          </Button>
          <Button variant="secondary" render={<Link href="/applications" />}>
            Applications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading profile…</div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
