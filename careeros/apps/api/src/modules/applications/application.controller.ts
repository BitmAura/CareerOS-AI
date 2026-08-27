import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { ApplicationService } from "./application.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JobService } from "../jobs/job.service";

@Controller("applications")
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(
    private readonly service: ApplicationService,
    private readonly jobService: JobService,
  ) {}

  @Get()
  findAll(@Req() req: { user: { userId: string } }) {
    return this.service.findByUserId(req.user.userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Post()
  async create(
    @Req() req: { user: { userId: string } },
    @Body() data: { jobId: string; coverLetter?: string },
  ) {
    const job = await this.jobService.findById(data.jobId);
    if (!job) {
      throw new NotFoundException("Job not found");
    }

    const existing = await this.service.findByUserAndJob(req.user.userId, data.jobId);
    if (existing) {
      throw new ConflictException("Already applied to this job");
    }

    return this.service.create({
      userId: req.user.userId,
      jobId: data.jobId,
      coverLetter: data.coverLetter,
      status: "applied",
    });
  }

  @Put(":id/status")
  updateStatus(@Param("id") id: string, @Body("status") status: string) {
    return this.service.updateStatus(id, status);
  }
}
