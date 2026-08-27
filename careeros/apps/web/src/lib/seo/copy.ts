import { PRODUCT_STANCE } from "@/lib/product/stance";

export const LANDING_FAQS = [
  {
    q: "What is CareerOS AI?",
    a: "CareerOS AI is an assisted Career Operating System for India manufacturing hunters (Purchase, procurement, SCM, plant). It grades OEM/careers seats, prepares a packet, and you Confirm apply — not a silent Easy Apply bot, and not a hunt for every industry.",
  },
  {
    q: "How many job applications can I do per day?",
    a: `Up to ${PRODUCT_STANCE.dailyQueueCap} confirmed seats per day, filled from up to ${PRODUCT_STANCE.dailyDigestRunsMax} searches (morning, midday, evening). You confirm each apply — we don’t auto-blast LinkedIn.`,
  },
  {
    q: "Is CareerOS better than Naukri Premium for procurement jobs?",
    a: "Naukri is strong for portal listings. CareerOS is the daily operating loop: grades, packets, Confirm apply, and tracking — including roles you paste from Naukri, LinkedIn, or company career pages. Many candidates use both.",
  },
  {
    q: "Does CareerOS auto-apply on LinkedIn?",
    a: "No. Silent Easy Apply bots can hurt your profile and often waste applications. CareerOS prepares the packet; you Confirm and submit on the employer site.",
  },
  {
    q: "Does it work across India or only Mumbai and Pune?",
    a: "Pan-India. Preferred cities are a soft boost only — we never hide other cities by default. Manufacturing hubs such as Pune, Chennai, Bengaluru, Hyderabad, Ahmedabad, Vadodara, NCR, Jamshedpur, and others are all in scope.",
  },
  {
    q: "Who is CareerOS for first?",
    a: "Only India manufacturing: Purchase, procurement, SCM, plant ops, and industrial sales into those plants. IT, banking, campus, and healthcare are not the daily hunt. You can still paste a JD, but live seats come from OEM/plant boards.",
  },
];

export const PUBLIC_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/for/purchase-scm", label: "Purchase & SCM" },
  { href: "/compare", label: "Compare" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
] as const;
