import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { MatchingService } from "./matching.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("matching")
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly service: MatchingService) {}

  @Get("jobs")
  getMatchedJobs(@Req() req: { user: { userId: string } }) {
    return this.service.matchJobs(req.user.userId);
  }

  @Post("jobs")
  matchJobs(
    @Req() req: { user: { userId: string } },
    @Body("userId") userId?: string,
  ) {
    const targetUserId = userId || req.user.userId;
    return this.service.matchJobs(targetUserId);
  }
}
