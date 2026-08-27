import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subscription } from "./entities/subscription.entity";
import { BillingEvent } from "./entities/billing-event.entity";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, BillingEvent])],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
