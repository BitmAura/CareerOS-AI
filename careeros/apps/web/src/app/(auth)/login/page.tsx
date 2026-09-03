"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AuthBackHome } from "@/components/marketing/auth-back-home";
import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { isSupabaseAuthReady } from "@/lib/supabase/env";
import { PRODUCT_STANCE } from "@/lib/product/stance";

function LoginInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const configured = isSupabaseAuthReady();
  const buy = PRODUCT_STANCE.candidateBuyBar;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <AuthBackHome />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <Link
            href="/"
            className="mx-auto text-lg font-bold tracking-tight text-foreground hover:opacity-80"
          >
            CareerOS
          </Link>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Private network pilot — India manufacturing (Purchase / SCM / plant). No password.
            New hunters use a magic link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? (
            <p className="text-sm text-destructive">
              {/missing_code|incomplete|otp_expired|invalid or has expired|access_denied/i.test(
                error,
              )
                ? "That sign-in link was already used or expired (Gmail/Outlook can open it once in the background). Request a new email and use the newest link once — or enter the 6-digit code if shown."
                : decodeURIComponent(error)}
            </p>
          ) : null}

          {configured ? (
            <>
              <MagicLinkForm next="/dashboard" />
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="bg-card px-2">or</span>
                </div>
              </div>
              <GoogleSignInButton next="/dashboard" />
              <p className="text-center text-xs text-muted-foreground">
                Google only works after Google is enabled in Supabase. Prefer magic link for this pilot.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Auth is not configured yet (missing Supabase URL / anon key).
            </p>
          )}

          <div className="space-y-2 rounded-lg border border-dashed border-border p-3 text-left text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Share with your network</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Open this page and enter your work email.</li>
              <li>
                Prefer the <strong>6-digit code</strong> from the email, or click the link{" "}
                <strong>once</strong> (do not reopen old emails).
              </li>
              <li>Complete Profile + Resume, then Confirm-apply from your queue.</li>
            </ol>
            <p>
              Pilot is invite-only and free while we prove value. Paid Concierge target is ₹
              {buy.conciergeInrMonthly}/mo only after digests + packets work for you —{" "}
              {buy.refundPromise}
            </p>
            <p>
              Limits: {PRODUCT_STANCE.dailyDigestRunsMax} digests/day,{" "}
              {PRODUCT_STANCE.dailyQueueCap} Confirm-apply seats/day. You always submit — never silent
              Easy Apply.
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            First time?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
