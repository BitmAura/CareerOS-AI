"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/use-auth";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Account for this CareerOS workspace." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Name</span>
            <br />
            {user?.name || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email</span>
            <br />
            {user?.email || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Plan</span>
            <br />
            {user?.plan || "starter"}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" render={<Link href="/profile" />}>
              Hunt targets
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/billing" />}>
              Billing
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              Log out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
