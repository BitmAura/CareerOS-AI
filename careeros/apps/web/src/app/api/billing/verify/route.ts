import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { localStore } from "@/lib/db/local-store";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan = "concierge",
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id) {
    return NextResponse.json(
      { message: "Missing order ID or payment ID" },
      { status: 400 }
    );
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const allowMock =
    process.env.NODE_ENV !== "production" || process.env.BILLING_ALLOW_MOCK === "true";

  // If live Razorpay key secret is present, verify SHA256 signature
  if (keySecret) {
    if (!razorpay_signature) {
      return NextResponse.json({ message: "Missing signature" }, { status: 400 });
    }
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { message: "Invalid payment signature verification failed" },
        { status: 400 }
      );
    }
  } else if (!allowMock) {
    return NextResponse.json(
      { message: "Billing is not configured. Payments are disabled until Razorpay is connected." },
      { status: 503 },
    );
  } else if (String(razorpay_order_id).startsWith("order_mock_") !== true) {
    return NextResponse.json(
      { message: "Invalid test payment. Use a mock order from this environment." },
      { status: 400 },
    );
  }

  const targetPlan = String(plan).toLowerCase() === "pro" ? "pro" : "concierge";

  // Update in localStore
  await localStore.updateUser(user.id, {
    plan: targetPlan,
  });

  // Update in Supabase if configured
  if (isSupabaseConfigured()) {
    const sb = getServiceSupabase()!;
    await sb
      .from("profiles")
      .update({ plan: targetPlan, updated_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return NextResponse.json({
    success: true,
    message: `Plan successfully upgraded to ${targetPlan === "concierge" ? "Concierge" : "Pro"}!`,
    plan: targetPlan,
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
  });
}
