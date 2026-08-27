import { MarketingShell } from "@/components/marketing/marketing-shell";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "CareerOS vs Naukri, LinkedIn bots & resume builders",
  description:
    "Naukri wins portal listings. LinkedIn bots win volume. Resume builders win PDFs. CareerOS wins the daily graded apply OS for India manufacturing.",
  path: "/compare",
});

export default function ComparePage() {
  return (
    <MarketingShell>
      <h1 className="font-heading text-4xl font-bold">CareerOS vs Naukri</h1>
      <p className="mt-4 text-[#3d4654]">
        Use Naukri for inventory. Use CareerOS for the hunt: grades, packets, Confirm apply, pipeline. Many candidates use both.
      </p>
      <ul className="mt-8 list-disc space-y-3 pl-5 text-[#3d4654]">
        <li>CareerOS: daily seat cap, Grade A–F, why/gaps, tailored packet, you submit.</li>
        <li>Naukri: large India portal inventory. Weak as a daily apply operating system.</li>
        <li>LinkedIn Easy Apply bots: volume without a packet. CareerOS never silent-applies.</li>
        <li>Resume builders: pretty PDF, no live OEM seats tied to that PDF.</li>
      </ul>
    </MarketingShell>
  );
}
