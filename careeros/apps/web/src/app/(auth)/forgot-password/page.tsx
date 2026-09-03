import Link from "next/link";
import { AuthBackHome } from "@/components/marketing/auth-back-home";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <AuthBackHome />
      <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-card p-6 text-center">
        <h1 className="text-2xl font-bold">No password needed</h1>
        <p className="text-sm text-muted-foreground">
          CareerOS uses email magic links. Request a new link on the sign-in page — you do not set or
          reset a password for the pilot.
        </p>
        <Link href="/login" className="inline-block text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
