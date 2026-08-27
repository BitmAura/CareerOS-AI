import { Controller, Post, Body } from "@nestjs/common";
import { AiAgentsService } from "./ai-agents.service";

@Controller("ai-agents")
export class AiAgentsController {
  constructor(private readonly service: AiAgentsService) {}

  @Post("optimize-resume")
  optimizeResume(@Body() body: { userId: string; resumeId: string; jobId: string }) {
    return this.service.optimizeResume(body.userId, body.resumeId, body.jobId);
  }

  @Post("cover-letter")
  coverLetter(@Body() body: { userId: string; resumeId: string; jobId: string }) {
    return this.service.generateCoverLetter(body.userId, body.resumeId, body.jobId);
  }
}
