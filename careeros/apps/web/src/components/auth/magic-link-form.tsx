"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function MagicLinkForm({ next = "/dashboard" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid work email.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          shouldCreateUser: true,
        },
      });
      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send magic link");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">Check your inbox</p>
        <p className="text-muted-foreground">
          We sent a sign-in link to <span className="font-medium text-foreground">{email.trim()}</span>.
          Open it on this device. Link expires in about an hour. Check spam if you do not see it.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="magic-email" className="text-sm font-medium text-foreground">
          Work email
        </label>
        <Input
          id="magic-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="h-10"
          required
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Sending link…" : "Email me a magic link"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
