import Link from "next/link";
import { PUBLIC_NAV } from "@/lib/seo/copy";
import { LandingNavCta } from "@/components/marketing/landing-nav-cta";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#12161c] font-sans">
      <header className="border-b border-[#12161c]/10 bg-[#f3f1ec]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-heading text-xl font-bold tracking-tight">
            CareerOS
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-[#3d4654] md:flex">
            {PUBLIC_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-[#12161c]">
                {item.label}
              </Link>
            ))}
          </nav>
          <LandingNavCta />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">{children}</main>
      <footer className="border-t border-[#12161c]/10 bg-[#ebe6dc] px-6 py-10 text-sm text-[#3d4654]">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-8 gap-y-2">
          {PUBLIC_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[#12161c]">
              {item.label}
            </Link>
          ))}
          <Link href="/privacy" className="hover:text-[#12161c]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#12161c]">
            Terms
          </Link>
          <Link href="/llms.txt" className="hover:text-[#12161c]">
            llms.txt
          </Link>
        </div>
      </footer>
    </div>
  );
}
