import { MarketingShell } from "@/components/marketing/marketing-shell";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Terms",
  description: "CareerOS terms: assisted Career OS for India. You Confirm every apply.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <MarketingShell>
      <h1 className="font-heading text-4xl font-bold">Terms</h1>
      <p className="mt-4 text-[#3d4654]">
        CareerOS is an assisted Career Operating System. You remain responsible for the accuracy of your resume and for every application you Confirm on employer sites.
      </p>
      <p className="mt-4 text-[#3d4654]">
        Concierge is billed in INR as stated on Pricing. The 14-day pilot promise applies after Profile and Resume are set.
      </p>
      <p className="mt-4 text-[#3d4654]">We do not guarantee interviews or offers.</p>
    </MarketingShell>
  );
}
