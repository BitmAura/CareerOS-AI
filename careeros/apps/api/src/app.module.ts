import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as path from "path";
import { BullMQModule } from "./queues/bullmq.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { ResumeModule } from "./modules/resume/resume.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { MatchingModule } from "./modules/matching/matching.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { InterviewsModule } from "./modules/interviews/interviews.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { BillingModule } from "./modules/billing/billing.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AiAgentsModule } from "./modules/ai-agents/ai-agents.module";
import { HealthModule } from "./modules/health/health.module";
import { DatabaseModule } from "./database/database.module";
import { ProvidersModule } from "./providers/providers.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), "../../.env"),
        path.resolve(process.cwd(), ".env"),
        path.resolve(__dirname, "../../../.env"),
      ],
    }),
    DatabaseModule,
    BullMQModule.forRoot(),
    ProvidersModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    ResumeModule,
    JobsModule,
    MatchingModule,
    ApplicationsModule,
    InterviewsModule,
    NotificationsModule,
    AnalyticsModule,
    BillingModule,
    AdminModule,
    AiAgentsModule,
  ],
})
export class AppModule {}
