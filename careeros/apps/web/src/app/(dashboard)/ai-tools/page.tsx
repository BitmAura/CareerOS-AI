"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { Sparkles, FileText, Mail, MessageSquare, Handshake, ListChecks } from "lucide-react";

const aiTools = [
  {
    title: "Resume Optimizer",
    description: "ATS-style scorecard (not employer ATS), keyword gap, improved regenerate",
    icon: FileText,
    href: "/resume",
    cta: "Open Resume Intelligence",
  },
  {
    title: "Resume builder",
    description: "Structured editor with AI rewrite per section and Markdown / print-PDF export",
    icon: FileText,
    href: "/resume/builder",
    cta: "Open builder",
  },
  {
    title: "Daily apply queue",
    description:
      "Portal ATS scan + live careers search, up to 15 graded seats/day — you confirm apply",
    icon: Sparkles,
    href: "/queue",
    cta: "Open daily queue",
  },
  {
    title: "Cover Letter Generator",
    description: "From Jobs or Daily queue — cover letter saved with the tailored packet",
    icon: Mail,
    href: "/jobs",
    cta: "Pick a job to tailor",
  },
  {
    title: "Apply-assist + knock-outs",
    description: "Form answer drafts + visa/notice/years warnings — you always click Submit",
    icon: ListChecks,
    href: "/queue",
    cta: "Open queue seat",
  },
  {
    title: "LinkedIn outreach draft",
    description: "≤300-char hiring-manager note — CareerOS never sends messages",
    icon: MessageSquare,
    href: "/queue",
    cta: "Draft from queue",
  },
  {
    title: "STAR interview bank",
    description: "Stories from your resume only — no invented metrics",
    icon: Sparkles,
    href: "/queue",
    cta: "Build stories",
  },
  {
    title: "India CTC negotiation",
    description: "Opener / pushback / walk-away scripts from your LPA targets",
    icon: Handshake,
    href: "/queue",
    cta: "Open scripts",
  },
];

export default function AiToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Tools"
        description={`${PRODUCT_STANCE.brandName} — ${PRODUCT_STANCE.brandTagline}. Resume recreate, portal job hunt, packets, and win-kit drafts (LLM when keyed).`}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {aiTools.map((tool) => (
          <Card key={tool.title} className="transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <tool.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
              </div>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" render={<Link href={tool.href} />}>
                {tool.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
