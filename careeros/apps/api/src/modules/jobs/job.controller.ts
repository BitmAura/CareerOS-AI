import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { JobService } from "./job.service";
import { Job } from "./entities/job.entity";

@Controller("jobs")
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  findAll(@Query() query: { source?: string; search?: string }) {
    return this.jobService.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.jobService.findById(id);
  }

  @Post()
  create(@Body() job: Partial<Job>) {
    return this.jobService.create(job);
  }

  @Post("batch")
  batchCreate(@Body() payload: { jobs: Partial<Job>[] }) {
    return this.jobService.batchCreate(payload.jobs || []);
  }
}
