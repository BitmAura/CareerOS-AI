import { Controller, Get, Post, Body } from "@nestjs/common";
import { InterviewService } from "./interview.service";
import { Interview } from "./entities/interview.entity";

@Controller("interviews")
export class InterviewController {
  constructor(private readonly service: InterviewService) {}

  @Get()
  findAll(@Body("userId") userId: string) {
    return this.service.findByUserId(userId);
  }

  @Post()
  create(@Body() data: Partial<Interview>) {
    return this.service.create(data);
  }
}
