"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function GoogleSignInButton({ next = "/dashboard" }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) {
        const msg = oauthError.message || "";
        setError(
          /provider is not enabled|unsupported provider/i.test(msg)
            ? "Google is not enabled on Supabase yet. Open Authentication → Providers → Google, turn it on, and paste your Google Cloud Client ID + Secret."
            : msg,
        );
        setLoading(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Google sign-in failed";
      setError(
        /provider is not enabled|unsupported provider/i.test(msg)
          ? "Google is not enabled on Supabase yet. Open Authentication → Providers → Google, turn it on, and paste your Google Cloud Client ID + Secret."
          : msg,
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button type="button" className="w-full" size="lg" disabled={loading} onClick={onClick}>
        {loading ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
