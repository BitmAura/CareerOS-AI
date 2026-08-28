"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AuthBackHome } from "@/components/marketing/auth-back-home";
import { GoogleSignInButton } from "@/components/auth/google-sign-in";

export default function RegisterPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

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
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Same as sign in — Continue with Google. First visit creates your hunter profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configured ? (
            <GoogleSignInButton next="/profile?onboarding=1" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Google signup needs Supabase URL and anon key in .env.local.
            </p>
          )}
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
