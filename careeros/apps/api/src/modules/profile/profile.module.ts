import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Profile } from "./entities/profile.entity";
import { WorkExperience } from "./entities/work-experience.entity";
import { Education } from "./entities/education.entity";
import { Skill } from "./entities/skill.entity";
import { ProfileService } from "./profile.service";
import { ProfileController } from "./profile.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Profile,
      WorkExperience,
      Education,
      Skill,
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
