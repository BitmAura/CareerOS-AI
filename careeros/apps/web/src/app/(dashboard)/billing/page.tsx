"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/store/use-auth";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import { toast } from "sonner";
import { api } from "@/lib/api";

const buy = PRODUCT_STANCE.candidateBuyBar;

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const plan = user?.plan || "starter";

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (targetPlan: "pro" | "concierge") => {
    setLoadingPlan(targetPlan);
    try {
      // 1. Create order on server
      const orderRes = await api<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        plan: string;
        isTestMode?: boolean;
      }>("/billing/order", {
        method: "POST",
        body: { plan: targetPlan },
      });

      // 2. If running with test mock order or script not loaded, complete via direct sandbox verification
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || orderRes.isTestMode || orderRes.keyId.startsWith("rzp_test_mock")) {
        // Direct sandbox verification
        const verifyRes = await api<{
          success: boolean;
          message: string;
          plan: string;
        }>("/billing/verify", {
          method: "POST",
          body: {
            razorpay_order_id: orderRes.orderId,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            plan: targetPlan,
          },
        });

        if (user) {
          setUser({ ...user, plan: verifyRes.plan });
        }
        toast.success(verifyRes.message || `Subscribed to ${targetPlan === "concierge" ? "Concierge" : "Pro"}!`);
        setLoadingPlan(null);
        return;
      }

      // 3. Open live Razorpay popup
      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: "CareerOS AI",
        description: `${targetPlan === "concierge" ? "Concierge" : "Pro"} Plan Subscription`,
        order_id: orderRes.orderId,
        prefill: {
          name: user?.name || "CareerOS Candidate",
          email: user?.email || "",
        },
        theme: {
          color: "#c45c26",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await api<{
              success: boolean;
              message: string;
              plan: string;
            }>("/billing/verify", {
              method: "POST",
              body: {
                ...response,
                plan: targetPlan,
              },
            });
            if (user) {
              setUser({ ...user, plan: verifyRes.plan });
            }
            toast.success(verifyRes.message || "Payment successful! Plan upgraded.");
          } catch (err: any) {
            toast.error(err.message || "Payment verification failed");
          } finally {
            setLoadingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate payment");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscriptions"
        description="India pricing for manufacturing & SCM leaders. You still Confirm every apply — CareerOS never Easy-Applies."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Starter Plan */}
        <Card className={plan === "starter" ? "border-primary shadow-sm" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-heading">Starter</CardTitle>
              {plan === "starter" && <Badge variant="secondary">Active Plan</Badge>}
            </div>
            <CardDescription className="text-2xl font-bold text-foreground">Free</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{PRODUCT_STANCE.pricingGate.starterOk}.</p>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Resume builder & versions
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> ATS Scorecard & gap detection
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Markdown / PDF export
              </li>
            </ul>
            <Button
              variant="outline"
              className="w-full"
              disabled={plan === "starter"}
            >
              {plan === "starter" ? "Current Plan" : "Downgrade to Starter"}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className={plan === "pro" ? "border-primary shadow-sm" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-heading">Pro</CardTitle>
              {plan === "pro" && <Badge variant="default">Active Plan</Badge>}
            </div>
            <CardDescription className="text-2xl font-bold text-foreground">
              ₹{buy.proInrMonthlyTarget.toLocaleString("en-IN")}<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{PRODUCT_STANCE.pricingGate.proRequires}</p>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> 3 daily digest searches (portal + live)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Auto-prepared apply packets
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Paste JD & alert ingest
              </li>
            </ul>
            <Button
              className="w-full"
              variant={plan === "pro" ? "outline" : "default"}
              disabled={plan === "pro" || loadingPlan === "pro"}
              onClick={() => handleCheckout("pro")}
            >
              {plan === "pro" ? "Current Plan" : loadingPlan === "pro" ? "Processing..." : "Upgrade to Pro"}
            </Button>
          </CardContent>
        </Card>

        {/* Concierge Plan (Featured) */}
        <Card className={plan === "concierge" ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary" : "border-primary/50"}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-heading">Concierge</CardTitle>
                <Badge className="bg-[#c45c26] text-white hover:bg-[#a84c1e]">Recommended</Badge>
              </div>
              {plan === "concierge" && <Badge variant="default">Active Plan</Badge>}
            </div>
            <CardDescription className="text-2xl font-bold text-foreground">
              ₹{buy.conciergeInrMonthly.toLocaleString("en-IN")}<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2 rounded-lg bg-white/60 p-3 text-xs text-foreground/90 border border-primary/20">
              <ShieldCheck className="h-4 w-4 text-[#c45c26] shrink-0 mt-0.5" />
              <span>{buy.refundPromise}</span>
            </div>
            <ul className="space-y-2 text-foreground/80">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> India OEM Workday + portal seats
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Match rubric, gaps, STAR notes, CTC scripts
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Up to {PRODUCT_STANCE.dailyQueueCap} seats/day (human Confirm apply)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Direct founder desk review
              </li>
            </ul>
            <Button
              className="w-full bg-[#c45c26] text-white hover:bg-[#a84c1e]"
              disabled={plan === "concierge" || loadingPlan === "concierge"}
              onClick={() => handleCheckout("concierge")}
            >
              {plan === "concierge" ? "Current Plan" : loadingPlan === "concierge" ? "Processing..." : "Start Concierge Plan"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">Payment & Security Guarantee</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          All payments are processed securely in INR via Razorpay (supporting UPI, Cards, NetBanking, and Wallets).
          We never store your card or banking credentials. 14-day refund window honored on Concierge if fewer than 5 India-fit manufacturing seats match your profile.
        </p>
      </div>
    </div>
  );
}
