import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Subscription } from "./entities/subscription.entity";
import * as crypto from "crypto";

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  findByUserId(userId: string) {
    return this.subscriptionRepository.findOne({ where: { userId } });
  }

  async createOrder(userId: string, plan: string = "concierge") {
    const targetPlan = plan.toLowerCase() === "pro" ? "pro" : "concierge";
    const amountInr = targetPlan === "pro" ? 999 : 1999;
    const amountPaise = amountInr * 100;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
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
          receipt: `rcpt_${userId.slice(0, 8)}_${Date.now()}`,
          notes: { userId, plan: targetPlan },
        }),
      });

      if (!response.ok) {
        throw new BadRequestException("Failed to create Razorpay order");
      }
      const order = await response.json();
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        plan: targetPlan,
      };
    }

    // Mock / dev order
    return {
      orderId: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
      amount: amountPaise,
      currency: "INR",
      keyId: "rzp_test_mock_careeros",
      plan: targetPlan,
      isTestMode: true,
    };
  }

  async verifyPayment(
    userId: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature?: string;
      plan?: string;
    },
  ) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan = "concierge" } = payload;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keySecret && razorpay_signature) {
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expected !== razorpay_signature) {
        throw new BadRequestException("Invalid payment signature");
      }
    }

    const targetPlan = plan.toLowerCase() === "pro" ? "pro" : "concierge";
    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let sub = await this.subscriptionRepository.findOne({ where: { userId } });
    if (!sub) {
      sub = this.subscriptionRepository.create({
        userId,
        plan: targetPlan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater,
        cancelAtPeriodEnd: false,
      });
    } else {
      sub.plan = targetPlan;
      sub.status = "active";
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = oneMonthLater;
    }

    await this.subscriptionRepository.save(sub);

    return {
      success: true,
      message: `Plan upgraded to ${targetPlan}`,
      plan: targetPlan,
      subscription: sub,
    };
  }
}
