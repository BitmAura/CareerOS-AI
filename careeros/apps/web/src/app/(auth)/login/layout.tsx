import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in to CareerOS — daily graded seats and Confirm apply for India manufacturing hunters.",
  path: "/login",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
