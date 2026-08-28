"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Menu, Minus, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { LandingNavCta } from "@/components/marketing/landing-nav-cta";
import { LANDING_FAQS, PUBLIC_NAV } from "@/lib/seo/copy";
import { buildLandingJsonLd } from "@/lib/seo/site";

const pitchProblems = [
  {
    today: "Resume building",
    where: "Canva, Word, random “AI resume” sites",
    pain: "Pretty PDF. No link to the jobs you’re actually applying for.",
  },
  {
    today: "ATS / score check",
    where: "Separate checkers and paid scans",
    pain: "A score with no daily hunt. You still don’t know which role to chase.",
  },
  {
    today: "Job search",
    where: "Naukri, LinkedIn, Indeed, company sites",
    pain: "Hundreds of links. Few feel genuine. Easy Apply burns time, not interviews.",
  },
  {
    today: "Apply + follow-up",
    where: "WhatsApp notes, Excel, memory",
    pain: "No packet, no “why this job,” no pipeline — applications disappear.",
  },
];

const pitchSolves = [
  {
    title: "One profile & targets",
    body: "Role, years, cities (Pan-India), CTC — manufacturing pack. The hunt starts from you, not a random feed.",
  },
  {
    title: "Resume + ATS-style readiness together",
    body: "Build, score, and fix gaps in the same place — then reuse versions for real JDs.",
  },
  {
    title: "Graded daily seats — not portal spam",
    body: `Up to ${PRODUCT_STANCE.dailyDigestRunsMax} searches/day and ${PRODUCT_STANCE.dailyQueueCap} seats with Grade A–F, why, and gaps. Paste Naukri/LinkedIn JDs when portals won’t open.`,
  },
  {
    title: "Packet → Confirm → track",
    body: "Tailored resume + cover, you Confirm apply, then Kanban the pipeline. No silent Easy Apply bots.",
  },
];

const steps = [
  { n: "01", title: "Account + targets", body: "Purchase / SCM / plant role, years, Pan-India cities, CTC." },
  { n: "02", title: "Resume ready", body: "Scorecard + builder so the packet starts from a strong base." },
  { n: "03", title: "Daily graded seats", body: "OEM + plant seats with why / gaps — not 200 junk links." },
  { n: "04", title: "Packet + Confirm", body: "See company + apply website. You submit there; then tap I submitted." },
  { n: "05", title: "Track pipeline", body: "Move each role through applied → interview → offer." },
];

type Cell = "yes" | "partial" | "no";

const compareRows: Array<{ label: string; careeros: Cell; naukri: Cell; bots: Cell; builders: Cell }> = [
  { label: "Daily apply ritual with a seat cap", careeros: "yes", naukri: "no", bots: "partial", builders: "no" },
  { label: "Match grade + why / gaps", careeros: "yes", naukri: "partial", bots: "no", builders: "no" },
  { label: "Tailored packet per job", careeros: "yes", naukri: "no", bots: "no", builders: "partial" },
  { label: "Human Confirm (no silent Easy Apply)", careeros: "yes", naukri: "yes", bots: "no", builders: "yes" },
  { label: "Applications tracker", careeros: "yes", naukri: "partial", bots: "no", builders: "no" },
  { label: "Large portal-only job inventory", careeros: "partial", naukri: "yes", bots: "partial", builders: "no" },
];

function CellIcon({ v }: { v: Cell }) {
  if (v === "yes") return <Check className="mx-auto h-4 w-4 text-[#c45c26]" aria-label="Yes" />;
  if (v === "partial") return <Minus className="mx-auto h-4 w-4 text-[#3d4654]/60" aria-label="Partial" />;
  return <X className="mx-auto h-4 w-4 text-[#12161c]/30" aria-label="No" />;
}

const faqs = LANDING_FAQS;

const pricing = [
  {
    name: "Starter",
    price: "Free",
    note: "Pilot",
    blurb: "Build the resume and see readiness before you pay for a hunt system.",
    items: ["Resume builder + versions", "ATS-style scorecard", "Markdown / print-PDF packet"],
    cta: "Create free account",
    href: "/login",
    featured: false,
  },
  {
    name: "Concierge",
    price: `₹${PRODUCT_STANCE.candidateBuyBar.conciergeInrMonthly.toLocaleString("en-IN")}/mo`,
    note: "Available",
    blurb: "Founder-reviewed daily pack for India manufacturing hunters. You still Confirm every apply.",
    items: [
      "India OEM Workday + portal seats (JCI/KONE/Shell + Greenhouse)",
      "Why-match, gaps, apply-assist, STAR, CTC scripts",
      `Up to ${PRODUCT_STANCE.dailyQueueCap} seats/day · you Confirm apply`,
      PRODUCT_STANCE.candidateBuyBar.refundPromise,
    ],
    cta: "Start Concierge",
    href: "/login",
    featured: true,
  },
  {
    name: "Pro",
    price: `₹${PRODUCT_STANCE.candidateBuyBar.proInrMonthlyTarget.toLocaleString("en-IN")}/mo`,
    note: "Coming soon",
    blurb: "Self-serve digests when India inventory depth is consistently buy-worthy.",
    items: [
      `${PRODUCT_STANCE.dailyDigestRunsMax} searches/day (portal + live)`,
      "Auto-prepare apply packets",
      "Paste JD + LinkedIn/Naukri alert ingest",
    ],
    cta: "Get early access",
    href: "/login",
    featured: false,
  },
];

export function LandingPage() {
  const jsonLd = buildLandingJsonLd();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      className={cn(
        "min-h-screen bg-[#f3f1ec] text-[#12161c] antialiased font-sans",
      )}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="font-heading text-xl font-bold tracking-tight"
          >
            CareerOS
          </Link>
          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 text-sm text-[#3d4654] md:flex">
            {PUBLIC_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-[#12161c]">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div suppressHydrationWarning className="hidden md:block">
              <LandingNavCta />
            </div>
            {/* Mobile hamburger button */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#12161c]/15 bg-white/60 text-[#12161c] md:hidden"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileNavOpen((v) => !v)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-30 flex flex-col bg-[#f3f1ec]/98 px-6 pt-20 pb-8 md:hidden">
            <button
              className="absolute right-6 top-5 flex h-9 w-9 items-center justify-center rounded-md border border-[#12161c]/15"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <nav className="flex flex-col gap-6">
              {PUBLIC_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xl font-semibold text-[#12161c] hover:text-[#c45c26]"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 flex flex-col gap-3" suppressHydrationWarning>
              <LandingNavCta />
            </div>
          </div>
        )}
      </header>

      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          aria-hidden
          style={{
            background: `
              radial-gradient(90% 70% at 70% 20%, rgba(196, 92, 38, 0.22), transparent 55%),
              radial-gradient(70% 50% at 10% 80%, rgba(30, 90, 110, 0.18), transparent 50%),
              linear-gradient(165deg, #ebe6dc 0%, #f3f1ec 45%, #dfe8ea 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0 -z-10 opacity-[0.35]"
          aria-hidden
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2312161c' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 pb-44 pt-28 md:pb-48 md:pt-32">
          <h1 className="mb-5 font-heading text-5xl font-extrabold tracking-tight text-[#12161c] md:text-7xl lg:text-8xl animate-[fadeUp_0.8s_ease_both]">
            CareerOS
          </h1>
          <p className="mb-3 inline-block rounded-full border border-[#c45c26]/40 bg-[#c45c26]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#a84c20] animate-[fadeUp_0.75s_ease_both]">
            India manufacturing only — Purchase, SCM, plant
          </p>
          <p className="max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-[#12161c] md:text-4xl animate-[fadeUp_0.9s_ease_both]">
            Daily hunt OS for plant, OEM, and procurement roles — not every industry.
          </p>
          <p className="mt-4 max-w-xl text-base text-[#3d4654] md:text-lg animate-[fadeUp_1s_ease_both]">
            Graded seats from OEM Workday and careers pages, tailored packets, you Confirm apply.
            Built for India manufacturing hunters. Not IT, banking, campus, or Easy Apply bots.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-[fadeUp_1.1s_ease_both]">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#compare" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              See how we differ
            </a>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[32vh] md:h-[36vh] animate-[riseIn_1.2s_ease_both]"
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a2330] via-[#1a2330]/92 to-transparent" />
          <div className="relative mx-auto flex h-full max-w-6xl items-end px-6 pb-8">
            <div className="grid w-full gap-3 text-[#e8ecef] md:grid-cols-3">
              <div className="border-l-2 border-[#c45c26] pl-4">
                <p className="font-heading text-3xl font-bold">A 99%</p>
                <p className="text-sm text-white/70">Grade · why this job · gaps</p>
              </div>
              <div className="border-l-2 border-white/20 pl-4">
                <p className="font-heading text-3xl font-bold">
                  {PRODUCT_STANCE.dailyQueueCap}
                </p>
                <p className="text-sm text-white/70">Confirmed seats / day max</p>
              </div>
              <div className="border-l-2 border-white/20 pl-4">
                <p className="font-heading text-3xl font-bold">OEM + plant</p>
                <p className="text-sm text-white/70">Manufacturing boards — Pan-India cities</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#12161c]/10 bg-[#f3f1ec] px-6 py-20" id="how">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-3xl font-bold md:text-4xl">
            How it works
          </h2>
          <p className="mt-2 max-w-xl text-[#3d4654]">
            One roof for the India manufacturing hunt — not five tabs and an Easy Apply gun.
          </p>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((s) => (
              <li key={s.n}>
                <p className="font-heading text-sm font-bold text-[#c45c26]">
                  {s.n}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-[#3d4654]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#1a2330] px-6 py-20 text-[#e8ecef]" id="features">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c45c26]">The pitch</p>
          <h2 className="mt-3 max-w-3xl font-heading text-3xl font-bold md:text-4xl">
            Today’s job hunt is split across tools that don’t talk to each other
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
            For a resume, people open a builder. For ATS, another site. For jobs, every portal —
            Naukri, LinkedIn, company pages — and still wonder what’s real. CareerOS puts the
            genuine loop in one place: ready resume, graded seats, apply packet, Confirm, track.
          </p>

          <div className="mt-14 grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="font-heading text-lg font-bold text-white/90">
                What people do today
              </h3>
              <ul className="mt-6 space-y-6">
                {pitchProblems.map((p) => (
                  <li key={p.today} className="border-t border-white/15 pt-5">
                    <p className="text-base font-semibold text-white">{p.today}</p>
                    <p className="mt-1 text-sm text-[#c45c26]/90">{p.where}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">{p.pain}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">
                What CareerOS does instead
              </h3>
              <ul className="mt-6 space-y-6">
                {pitchSolves.map((s) => (
                  <li key={s.title} className="border-t border-[#c45c26]/40 pt-5">
                    <p className="text-base font-semibold text-white">{s.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/65">{s.body}</p>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-10 inline-flex gap-2 bg-[#c45c26] text-white hover:bg-[#a84c20]",
                )}
              >
                Start on CareerOS
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="mt-14 max-w-2xl text-sm text-white/45">
            Coming next: interview prep from your packets, notifications, deeper career-page
            sources, and Pro self-serve — Concierge is available now.
          </p>
        </div>
      </section>

      <section className="bg-[#f3f1ec] px-6 py-20" id="compare">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-3xl font-bold md:text-4xl">
            CareerOS vs Naukri, LinkedIn bots &amp; resume builders
          </h2>
          <p className="mt-2 max-w-2xl text-[#3d4654]">
            Naukri wins on portal listings. LinkedIn bots win on volume. Resume builders win on
            PDFs. CareerOS wins on a daily, explained apply system you control.
          </p>

          <div className="mt-10 overflow-x-auto rounded-lg border border-[#12161c]/10 bg-white/50">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#12161c]/10 bg-[#ebe6dc]/80">
                  <th className="px-4 py-3 font-semibold">Capability</th>
                  <th className="px-3 py-3 text-center font-semibold text-[#c45c26]">CareerOS</th>
                  <th className="px-3 py-3 text-center font-medium text-[#3d4654]">Naukri Premium</th>
                  <th className="px-3 py-3 text-center font-medium text-[#3d4654]">LI auto-apply</th>
                  <th className="px-3 py-3 text-center font-medium text-[#3d4654]">Resume builders</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.label} className="border-b border-[#12161c]/8">
                    <td className="px-4 py-3 text-[#12161c]">{row.label}</td>
                    <td className="px-3 py-3 text-center">
                      <CellIcon v={row.careeros} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CellIcon v={row.naukri} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CellIcon v={row.bots} />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CellIcon v={row.builders} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[#3d4654]">
            ✓ = strong · − = partial · ✕ = missing. Naukri still wins raw portal inventory; CareerOS
            wins the apply operating system.
          </p>
        </div>
      </section>

      <section className="border-t border-[#12161c]/10 bg-[#ebe6dc] px-6 py-20" id="pricing">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-3xl font-bold md:text-4xl">
            Plans
          </h2>
          <p className="mt-2 max-w-xl text-[#3d4654]">
            Free to start. Concierge at a clear India price when the daily pack is worth your time.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {pricing.map((tier) => (
              <div
                key={tier.name}
                className={cn(
                  "flex flex-col border bg-[#f3f1ec]/80 p-6",
                  tier.featured
                    ? "border-[#c45c26] shadow-[0_0_0_1px_rgba(196,92,38,0.25)]"
                    : "border-[#12161c]/12",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#c45c26]">
                    {tier.name}
                  </p>
                  <span className="text-xs text-[#3d4654]">{tier.note}</span>
                </div>
                <p className="mt-3 font-heading text-3xl font-bold">
                  {tier.price}
                </p>
                <p className="mt-3 text-sm text-[#3d4654]">{tier.blurb}</p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-[#12161c]">
                  {tier.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c45c26]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={cn(
                    buttonVariants({
                      variant: tier.featured ? "default" : "outline",
                      size: "sm",
                    }),
                    "mt-8 inline-flex justify-center",
                    tier.featured && "bg-[#c45c26] hover:bg-[#a84c20]",
                  )}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f3f1ec] px-6 py-20" id="faq">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-heading text-3xl font-bold md:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-[#3d4654]">
            Straight answers for candidates comparing CareerOS with Naukri, LinkedIn, and resume tools.
          </p>
          <dl className="mt-10 space-y-8">
            {faqs.map((item) => (
              <div key={item.q} className="border-t border-[#12161c]/10 pt-6">
                <dt className="text-lg font-semibold">{item.q}</dt>
                <dd className="mt-2 text-[#3d4654]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#1a2330] px-6 py-24 text-center text-white">
        <div
          className="absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background:
              "radial-gradient(50% 60% at 50% 0%, rgba(196,92,38,0.35), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="font-heading text-4xl font-bold md:text-5xl">
            CareerOS
          </p>
          <p className="mt-4 text-white/70">
            Next plant / procurement role shouldn’t depend on Easy Apply. Run the manufacturing OS.
          </p>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-8 inline-flex gap-2 bg-[#c45c26] text-white hover:bg-[#a84c20]",
            )}
          >
            Create account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#12161c]/10 bg-[#ebe6dc] px-6 py-12 text-sm text-[#3d4654]">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          <div>
            <p className="font-heading font-bold text-[#12161c]">
              CareerOS AI
            </p>
            <p className="mt-2 max-w-xs">
              Assisted Career OS for India manufacturing only — Purchase, SCM, plant. Pan-India.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#12161c]">Product</p>
            <ul className="mt-2 space-y-1">
              {PUBLIC_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-[#12161c]">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/privacy" className="hover:text-[#12161c]">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#12161c]">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-[#12161c]">Account</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/login" className="hover:text-[#12161c]">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#12161c]">
                  Create account
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="hover:text-[#12161c]">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
