import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Application } from "./entities/application.entity";

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  findByUserId(userId: string) {
    return this.applicationRepository.find({
      where: { userId },
      relations: ["job"],
      order: { appliedAt: "DESC" },
    });
  }

  findById(id: string) {
    return this.applicationRepository.findOne({
      where: { id },
      relations: ["job"],
    });
  }

  findByUserAndJob(userId: string, jobId: string) {
    return this.applicationRepository.findOne({ where: { userId, jobId } });
  }

  create(application: Partial<Application>) {
    const a = this.applicationRepository.create(application);
    return this.applicationRepository.save(a);
  }

  updateStatus(id: string, status: Application["status"]) {
    return this.applicationRepository.update(id, { status, updatedAt: new Date() });
  }
}
