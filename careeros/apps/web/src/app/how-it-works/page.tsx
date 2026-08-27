import { MarketingShell } from "@/components/marketing/marketing-shell";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "How CareerOS works",
  description:
    "CareerOS daily loop for India: targets, resume, graded OEM seats, packet, you Confirm apply. Pan-India manufacturing Purchase & SCM.",
  path: "/how-it-works",
});

const steps = [
  ["Account + targets", "Role, years, cities (Pan-India), CTC, notice, manufacturing pack."],
  ["Resume ready", "Scorecard + builder so packets start from a real base resume."],
  ["Daily graded seats", "Up to 3 searches/day. Grade A–F, why, and gaps — not 200 junk links."],
  ["Packet + Confirm", "CareerOS shows company + the exact careers website. You download the packet, apply on THAT site, then tap I submitted. We never Easy Apply for you."],
  ["Track pipeline", "Applied → interview → offer. Interviews prove the OS, not vanity queue counts."],
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <h1 className="font-heading text-4xl font-bold">How it works</h1>
      <p className="mt-4 text-[#3d4654]">
        One system for the hunt. Built for India manufacturing professionals who still Confirm every apply.
      </p>
      <ol className="mt-10 space-y-6">
        {steps.map(([title, body], i) => (
          <li key={title}>
            <p className="text-sm font-semibold text-[#c45c26]">0{i + 1}</p>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-[#3d4654]">{body}</p>
          </li>
        ))}
      </ol>
    </MarketingShell>
  );
}
