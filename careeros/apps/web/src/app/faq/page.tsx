import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LANDING_FAQS } from "@/lib/seo/copy";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "FAQ — CareerOS for India job seekers",
  description:
    "CareerOS FAQ: daily seats, Pan-India cities, vs Naukri, no LinkedIn Easy Apply bots, Purchase & SCM first.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <MarketingShell>
      <h1 className="font-heading text-4xl font-bold">FAQ</h1>
      <p className="mt-4 text-[#3d4654]">Straight answers for India manufacturing hunters comparing CareerOS with Naukri and resume tools.</p>
      <dl className="mt-10 space-y-8">
        {LANDING_FAQS.map((item) => (
          <div key={item.q}>
            <dt className="text-lg font-semibold">{item.q}</dt>
            <dd className="mt-2 text-[#3d4654]">{item.a}</dd>
          </div>
        ))}
      </dl>
    </MarketingShell>
  );
}
