"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/use-auth";

/** Always SSR the same CTAs so hydration cannot mismatch on auth. */
export function LandingNavCta() {
  const [mounted, setMounted] = useState(false);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  useEffect(() => {
    useAuth.getState().hydrate();
    setMounted(true);
  }, []);

  if (mounted && isAuthenticated) {
    return (
      <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
        Open dashboard
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2" suppressHydrationWarning>
      <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
        Sign in
      </Link>
      <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
        Start free
      </Link>
    </div>
  );
}
