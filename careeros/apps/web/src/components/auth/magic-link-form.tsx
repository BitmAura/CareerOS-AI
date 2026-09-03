"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { useAuth, type AuthUser } from "@/store/use-auth";
import { api } from "@/lib/api";

export function MagicLinkForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendLink = async (e: React.FormEvent) => {
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
        return;
      }
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send sign-in email");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(token)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "email",
      });
      if (verifyError) {
        setError(
          /expired|invalid|otp/i.test(verifyError.message)
            ? "Code invalid or expired. Request a new email, then use the newest code (or click the link once)."
            : verifyError.message,
        );
        return;
      }
      try {
        const me = await api<{ user: AuthUser; access_token?: string }>("/auth/me");
        if (me?.user) {
          setSession(me.user, me.access_token || "supabase");
        }
      } catch {
        // Cookie session may still work for AuthCheck
      }
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify code");
    } finally {
      setLoading(false);
    }
  };

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="space-y-3">
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">Check your inbox</p>
          <p className="text-muted-foreground">
            We emailed <span className="font-medium text-foreground">{email.trim()}</span>. Prefer
            the <strong>6-digit code</strong> if the email shows one — more reliable than the link.
            If you use the link, click it <strong>once</strong> (email scanners can burn it).
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="magic-code" className="text-sm font-medium text-foreground">
            6-digit code
          </label>
          <Input
            id="magic-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
            className="h-10 tracking-widest"
            maxLength={8}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Verifying…" : "Verify and continue"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading}
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Use a different email
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    );
  }

  return (
    <form onSubmit={sendLink} className="space-y-3">
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
        {loading ? "Sending…" : "Email me a sign-in link"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
