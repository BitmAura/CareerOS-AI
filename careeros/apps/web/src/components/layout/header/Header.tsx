"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/store/use-auth";

const planLabels: Record<string, string> = {
  starter: "Starter",
  professional: "Pro",
  premium: "Premium",
};

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard";
    if (pathname.startsWith("/resume/builder")) return "Builder";
    if (pathname.startsWith("/resume")) return "Resume";
    if (pathname.startsWith("/queue")) return "Daily queue";
    if (pathname.startsWith("/applications")) return "Applications";
    if (pathname.startsWith("/profile")) return "Profile";
    if (pathname.startsWith("/jobs")) return "Jobs";
    if (pathname.startsWith("/interviews")) return "Interviews";
    if (pathname.startsWith("/ai-tools")) return "AI tools";
    if (pathname.startsWith("/billing")) return "Billing";
    if (pathname.startsWith("/settings")) return "Settings";
    if (pathname.startsWith("/analytics")) return "Analytics";
    if (pathname.startsWith("/notifications")) return "Notifications";
    const segment = pathname.split("/").filter(Boolean).pop();
    return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : "Dashboard";
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <p className="text-sm text-muted-foreground">{getPageTitle()}</p>

      <div className="flex items-center gap-3">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" className="flex items-center gap-2" />
              }
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {planLabels[user.plan] || "Starter"} Plan
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem render={<Link href="/profile" />}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/settings" />}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/billing" />}>
                  Billing
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
