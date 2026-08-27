import { MarketingShell } from "@/components/marketing/marketing-shell";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Privacy",
  description: "CareerOS privacy: account, resume, and hunt data for the India Career OS.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <h1 className="font-heading text-4xl font-bold">Privacy</h1>
      <p className="mt-4 text-[#3d4654]">
        CareerOS stores your account, career targets, resumes, and apply-queue data to run the daily hunt. We do not silent-apply on LinkedIn or Naukri on your behalf.
      </p>
      <p className="mt-4 text-[#3d4654]">
        Job discovery hits public employer career pages. Paste-JD content is used only to grade and packet that seat.
      </p>
      <p className="mt-4 text-[#3d4654]">Contact: use the in-app Settings email on your account for data requests.</p>
    </MarketingShell>
  );
}
