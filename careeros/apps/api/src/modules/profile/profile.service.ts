import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Profile } from "./entities/profile.entity";

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  findByUserId(userId: string) {
    return this.profileRepository.findOne({
      where: { userId },
      relations: ["workExperience", "education", "skills"],
    });
  }

  create(profile: Partial<Profile>) {
    const p = this.profileRepository.create(profile);
    return this.profileRepository.save(p);
  }

  update(id: string, changes: Partial<Profile>) {
    return this.profileRepository.update(id, changes);
  }
}
