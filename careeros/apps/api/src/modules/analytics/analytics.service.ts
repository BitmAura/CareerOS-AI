import { Injectable } from "@nestjs/common";

@Injectable()
export class AnalyticsService {
  getApplicationFunnel(_userId: string) {
    return { applied: 0, shortlisted: 0, interview: 0, offer: 0 };
  }

  getResponseRate(_userId: string) {
    return { rate: 0, totalApplications: 0, responses: 0 };
  }
}
