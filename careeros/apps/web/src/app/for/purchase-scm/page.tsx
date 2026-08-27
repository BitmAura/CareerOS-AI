import { MarketingShell } from "@/components/marketing/marketing-shell";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Purchase, procurement & SCM jobs — India manufacturing",
  description:
    "CareerOS for India Purchase Managers, buyers, sourcing, and SCM. Pan-India OEM seats (Pune, Chennai, Bengaluru, Hyderabad, NCR). Packets you Confirm — not Easy Apply.",
  path: "/for/purchase-scm",
});

export default function AudiencePage() {
  return (
    <MarketingShell>
      <h1 className="font-heading text-4xl font-bold">For Purchase &amp; SCM in India</h1>
      <p className="mt-4 text-[#3d4654]">
        First beachhead: manufacturing procurement and supply chain — plant and OEM roles across India, not only metros.
      </p>
      <p className="mt-4 text-[#3d4654]">
        Cities are a ranking boost: Pune, Mumbai, Chennai, Bengaluru, Hyderabad, Ahmedabad, Vadodara, NCR, Jamshedpur, and others stay visible. We do not wall you into one city.
      </p>
      <p className="mt-4 text-[#3d4654]">
        Discovery prefers OEM Workday and Greenhouse careers. Paste Naukri or LinkedIn JDs when the portal will not open.
      </p>
    </MarketingShell>
  );
}
