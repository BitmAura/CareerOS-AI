"use client";

import { useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type AuthUser } from "@/store/use-auth";
import { api, ApiError } from "@/lib/api";

function SessionShell({ label }: { label: string }) {
  return (
    <div className="flex h-screen w-full bg-background">
      <div className="hidden w-56 border-r bg-sidebar md:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b" />
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hydrated, hydrate, logout, setSession, token } = useAuth();
  const router = useRouter();

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await api<{ user: AuthUser; access_token?: string }>("/auth/me");
        if (cancelled) return;
        if (me?.user) {
          setSession(me.user, me.access_token || token || "supabase");
          return;
        }
        logout();
        router.replace("/login");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          logout();
          router.replace("/login");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, logout, router, setSession, token]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace("/login");
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) return <SessionShell label="Loading…" />;
  if (!isAuthenticated) return <SessionShell label="Redirecting to sign in…" />;

  return <>{children}</>;
}
