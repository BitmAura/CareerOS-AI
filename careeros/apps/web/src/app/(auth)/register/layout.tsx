import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Create account",
  description: "Start CareerOS free: resume + ATS-style score, then hunt India manufacturing Purchase & SCM seats.",
  path: "/register",
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
