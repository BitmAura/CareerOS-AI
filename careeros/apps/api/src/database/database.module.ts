import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { User } from "../modules/users/entities/user.entity";
import { Profile } from "../modules/profile/entities/profile.entity";
import { WorkExperience } from "../modules/profile/entities/work-experience.entity";
import { Education } from "../modules/profile/entities/education.entity";
import { Skill } from "../modules/profile/entities/skill.entity";
import { Resume } from "../modules/resume/entities/resume.entity";
import { Job } from "../modules/jobs/entities/job.entity";
import { Application } from "../modules/applications/entities/application.entity";
import { Interview } from "../modules/interviews/entities/interview.entity";
import { Notification } from "../modules/notifications/entities/notification.entity";
import { Subscription } from "../modules/billing/entities/subscription.entity";
import { BillingEvent } from "../modules/billing/entities/billing-event.entity";

const entities = [
  User,
  Profile,
  WorkExperience,
  Education,
  Skill,
  Resume,
  Job,
  Application,
  Interview,
  Notification,
  Subscription,
  BillingEvent,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("DATABASE_URL") || "./careeros.db";
        const isPostgres = url.startsWith("postgres");

        if (isPostgres) {
          return {
            type: "postgres" as const,
            url,
            entities,
            synchronize: process.env.NODE_ENV !== "production",
            logging: false,
          };
        }

        const sqlitePath = url.replace(/^file:/, "") || "./careeros.db";
        return {
          type: "sqlite" as const,
          database: sqlitePath,
          entities,
          synchronize: true,
          logging: false,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
