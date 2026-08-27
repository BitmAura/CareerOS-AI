import { Controller, Get, Post, Body, Patch, Param, Req, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  findAll(@Req() req: { user: { userId: string } }) {
    return this.service.findByUserId(req.user.userId);
  }

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body() data: Partial<{ title: string; message: string; type: string; data: string }>,
  ) {
    return this.service.create({
      ...data,
      userId: req.user.userId,
    });
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string) {
    return this.service.markAsRead(id);
  }
}
