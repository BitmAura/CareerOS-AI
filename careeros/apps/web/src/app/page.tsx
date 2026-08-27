import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { defaultMetadata, siteConfig } from "@/lib/seo/site";

export const metadata: Metadata = {
  ...defaultMetadata,
  title: `${siteConfig.name} — Assisted Career OS for India manufacturing`,
  description: siteConfig.description,
  openGraph: {
    ...defaultMetadata.openGraph,
    url: siteConfig.url,
  },
  alternates: { canonical: siteConfig.url },
};

export default function Home() {
  return <LandingPage />;
}
