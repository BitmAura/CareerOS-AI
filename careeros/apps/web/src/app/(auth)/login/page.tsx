"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AuthBackHome } from "@/components/marketing/auth-back-home";
import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { isSupabaseAuthReady } from "@/lib/supabase/env";

function LoginInner() {
  const params = useSearchParams();
  const error = params.get("error");
  const configured = isSupabaseAuthReady();

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
            Google only. CareerOS uses your Google account via Supabase Auth — no password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive">
              {error === "missing_code"
                ? "Google did not return a login code. Enable the Google provider in Supabase Auth."
                : decodeURIComponent(error)}
            </p>
          ) : null}
          {configured ? (
            <GoogleSignInButton next="/dashboard" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Add the Vercel Supabase integration vars (SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY),
              then enable Google in Supabase Authentication → Providers. Add this site URL to
              Auth redirect URLs: <code className="text-xs">/auth/callback</code>.
            </p>
          )}
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
