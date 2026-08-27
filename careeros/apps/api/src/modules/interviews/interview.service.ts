import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Interview } from "./entities/interview.entity";

@Injectable()
export class InterviewService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
  ) {}

  findByUserId(userId: string) {
    return this.interviewRepository.find({
      where: { userId },
      relations: ["job"],
      order: { scheduledAt: "ASC" },
    });
  }

  create(data: Partial<Interview>) {
    const i = this.interviewRepository.create(data);
    return this.interviewRepository.save(i);
  }
}
