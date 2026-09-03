"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useAuth, type AuthUser } from "@/store/use-auth";
import { api } from "@/lib/api";

export function PasswordSignInForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      setError("Enter email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (signError) {
        setError(signError.message);
        return;
      }
      try {
        const me = await api<{ user: AuthUser; access_token?: string }>("/auth/me");
        if (me?.user) {
          setSession(me.user, me.access_token || "supabase");
        }
      } catch {
        // Cookie session may still work
      }
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="password-email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="password-email"
          type="email"
          autoComplete="username"
          placeholder="you@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="h-10"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password-secret" className="text-sm font-medium text-foreground">
          Password
        </label>
        <Input
          id="password-secret"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="h-10"
          required
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Signing in…" : "Sign in with password"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
