import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Pricing — Concierge ₹1,999/mo India",
  description:
    "CareerOS pricing in INR: free Starter, Concierge ₹1,999/mo for India manufacturing hunters, Pro ₹999 target. 14-day pilot promise.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <MarketingShell>
      <h1 className="font-heading text-4xl font-bold">Pricing</h1>
      <p className="mt-4 text-[#3d4654]">INR. You still Confirm every apply. Built for India, not US SaaS list prices.</p>
      <ul className="mt-10 space-y-8">
        <li>
          <h2 className="text-xl font-semibold">Starter — Free</h2>
          <p className="mt-1 text-[#3d4654]">{PRODUCT_STANCE.pricingGate.starterOk}</p>
        </li>
        <li>
          <h2 className="text-xl font-semibold">
            Concierge — ₹{PRODUCT_STANCE.candidateBuyBar.conciergeInrMonthly.toLocaleString("en-IN")}/mo
          </h2>
          <p className="mt-1 text-[#3d4654]">{PRODUCT_STANCE.pricingGate.conciergeOk}</p>
          <p className="mt-2 text-[#3d4654]">{PRODUCT_STANCE.candidateBuyBar.refundPromise}</p>
        </li>
        <li>
          <h2 className="text-xl font-semibold">
            Pro — ₹{PRODUCT_STANCE.candidateBuyBar.proInrMonthlyTarget.toLocaleString("en-IN")}/mo target
          </h2>
          <p className="mt-1 text-[#3d4654]">Coming when India inventory depth is consistently buy-worthy.</p>
        </li>
      </ul>
      <Link href="/register" className="mt-10 inline-block font-semibold text-[#c45c26]">
        Create account →
      </Link>
    </MarketingShell>
  );
}
