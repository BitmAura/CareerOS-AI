import type { Metadata } from "next";
import AuthCheck from "@/components/providers/auth-check";
import { AppShell } from "@/components/layout/app-shell/AppShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthCheck>
      <AppShell>{children}</AppShell>
    </AuthCheck>
  );
}
