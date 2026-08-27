import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MatchingService } from "./matching.service";
import { MatchingController } from "./matching.controller";
import { Job } from "../jobs/entities/job.entity";
import { Resume } from "../resume/entities/resume.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Job, Resume])],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
