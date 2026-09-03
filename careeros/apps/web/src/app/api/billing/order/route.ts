import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { PRODUCT_STANCE } from "@/lib/product/stance";
import crypto from "crypto";

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan || "concierge").toLowerCase();

  const buy = PRODUCT_STANCE.candidateBuyBar;
  let amountInr: number = buy.conciergeInrMonthly;
  if (plan === "pro") {
    amountInr = buy.proInrMonthlyTarget;
  } else if (plan === "starter") {
    return NextResponse.json({
      message: "Starter plan is free. No payment required.",
      plan: "starter",
    });
  }

  const amountPaise = amountInr * 100;
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // If live Razorpay credentials are present, call Razorpay Orders API
  if (keyId && keySecret) {
    try {
      const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
          notes: {
            userId: user.id,
            plan,
            userEmail: user.email,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        return NextResponse.json(
          { message: errJson.error?.description || "Failed to create Razorpay order" },
          { status: response.status }
        );
      }

      const orderData = await response.json();
      return NextResponse.json({
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId,
        plan,
      });
    } catch (e: any) {
      return NextResponse.json(
        { message: e.message || "Failed to connect to Razorpay" },
        { status: 500 }
      );
    }
  }

  // Developer Test Mode / Mock Flow — never in production without explicit opt-in
  const allowMock =
    process.env.NODE_ENV !== "production" || process.env.BILLING_ALLOW_MOCK === "true";
  if (!allowMock) {
    return NextResponse.json(
      { message: "Razorpay is not configured. Paid upgrades are disabled." },
      { status: 503 },
    );
  }

  const mockOrderId = `order_mock_${crypto.randomBytes(8).toString("hex")}`;
  return NextResponse.json({
    orderId: mockOrderId,
    amount: amountPaise,
    currency: "INR",
    keyId: keyId || "rzp_test_mock_careeros",
    plan,
    isTestMode: true,
  });
}
