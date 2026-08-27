import { Injectable } from "@nestjs/common";

@Injectable()
export class AiAgentsService {
  async optimizeResume(_userId: string, _resumeId: string, _jobId: string) {
    return { optimizedResume: "", suggestions: [] as string[] };
  }

  async generateCoverLetter(_userId: string, _resumeId: string, _jobId: string) {
    return { coverLetter: "" };
  }
}
