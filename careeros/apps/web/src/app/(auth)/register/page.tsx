"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AuthBackHome } from "@/components/marketing/auth-back-home";
import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { isSupabaseAuthReady } from "@/lib/supabase/env";
import { PRODUCT_STANCE } from "@/lib/product/stance";

export default function RegisterPage() {
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
          <CardTitle className="text-2xl">Join the pilot</CardTitle>
          <CardDescription>
            New hunters: email a magic link. First visit opens onboarding for your India plant /
            Purchase / SCM profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {configured ? (
            <>
              <MagicLinkForm next="/profile?onboarding=1" />
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide text-muted-foreground">
                  <span className="bg-card px-2">or</span>
                </div>
              </div>
              <GoogleSignInButton next="/profile?onboarding=1" />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Signup needs Supabase URL and anon key configured.
            </p>
          )}

          <div className="space-y-1 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">What you get in the pilot</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>OEM / ATS board matches (not US tech spam)</li>
              <li>Tailored packets you upload yourself</li>
              <li>
                Up to {PRODUCT_STANCE.dailyQueueCap} Confirm-apply seats / day — you always click
                submit
              </li>
            </ul>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already hunting?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
