import { PRODUCT_STANCE } from "@/lib/product/stance";

export const LANDING_FAQS = [
  {
    q: "What is CareerOS AI?",
    a: "CareerOS AI is an assisted Career Operating System for job seekers in India. It helps you set career targets, improve your resume with an ATS-style score, get a short daily list of graded jobs, prepare a tailored apply packet, Confirm apply yourself, and track the pipeline — instead of spraying Easy Apply.",
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
    a: "India manufacturing Purchase, procurement, and supply-chain professionals first (plant, OEM, and industrial). Healthcare and other industries ship next as industry packs on the same OS.",
  },
];

export const PUBLIC_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/for/purchase-scm", label: "Purchase & SCM" },
  { href: "/compare", label: "Compare" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
] as const;
