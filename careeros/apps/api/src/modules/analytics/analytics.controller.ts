import { Controller, Get, Body } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get("funnel")
  funnel(@Body("userId") userId: string) {
    return this.service.getApplicationFunnel(userId);
  }

  @Get("response-rate")
  responseRate(@Body("userId") userId: string) {
    return this.service.getResponseRate(userId);
  }
}
