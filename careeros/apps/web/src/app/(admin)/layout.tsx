import AuthCheck from "@/components/providers/auth-check";
import { AppShell } from "@/components/layout/app-shell/AppShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthCheck>
      <AppShell>{children}</AppShell>
    </AuthCheck>
  );
}
