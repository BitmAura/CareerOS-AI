import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get()
  findSubscription(@Req() req: { user: { userId: string } }) {
    return this.service.findByUserId(req.user.userId);
  }

  @Post("order")
  createOrder(
    @Req() req: { user: { userId: string } },
    @Body("plan") plan?: string,
  ) {
    return this.service.createOrder(req.user.userId, plan);
  }

  @Post("verify")
  verifyPayment(
    @Req() req: { user: { userId: string } },
    @Body()
    body: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature?: string;
      plan?: string;
    },
  ) {
    return this.service.verifyPayment(req.user.userId, body);
  }
}
