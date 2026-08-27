"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Shared “← Back to CareerOS” for login / register */
export function AuthBackHome() {
  return (
    <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to CareerOS
      </Link>
    </div>
  );
}
