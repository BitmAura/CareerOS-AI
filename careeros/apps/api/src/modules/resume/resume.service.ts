import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Resume } from "./entities/resume.entity";

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(Resume)
    private readonly resumeRepository: Repository<Resume>,
  ) {}

  findByUserId(userId: string) {
    return this.resumeRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  findOne(id: string) {
    return this.resumeRepository.findOne({ where: { id } });
  }

  /**
   * G2 Fix: Return historical versions of a resume.
   * Versions are resumes owned by the same user where parsedData includes the parent resume id.
   * Until a dedicated resume_versions table is added, we return the 10 most recent
   * update snapshots stored in the `parsedData.versions` JSON array field.
   */
  async findVersionsByResumeId(resumeId: string): Promise<Array<{ id: string; label: string; createdAt: Date; aiScore?: number; markdown?: string }>> {
    const resume = await this.resumeRepository.findOne({ where: { id: resumeId } });
    if (!resume) return [];
    try {
      const pd = typeof resume.parsedData === "string" ? JSON.parse(resume.parsedData) : (resume.parsedData || {});
      const versions: Array<{ id: string; label: string; createdAt: string; aiScore?: number; markdown?: string }> = pd.versions || [];
      return versions
        .slice(-20)
        .reverse()
        .map((v) => ({
          ...v,
          createdAt: new Date(v.createdAt),
        }));
    } catch {
      return [];
    }
  }

  /**
   * Save a new version snapshot into parsedData.versions array.
   * Called before any PUT that changes parsedData significantly.
   */
  async createVersion(id: string, label: string, markdown: string, aiScore?: number): Promise<void> {
    const resume = await this.resumeRepository.findOne({ where: { id } });
    if (!resume) return;
    const pd = typeof resume.parsedData === "string" ? JSON.parse(resume.parsedData || "{}") : (resume.parsedData || {});
    const versions: unknown[] = pd.versions || [];
    versions.push({
      id: `v-${Date.now()}`,
      label,
      createdAt: new Date().toISOString(),
      aiScore,
      markdown,
    });
    // Keep last 20 versions only
    pd.versions = versions.slice(-20);
    await this.resumeRepository.update(id, { parsedData: JSON.stringify(pd) });
  }

  create(resume: Partial<Resume>) {
    const r = this.resumeRepository.create(resume);
    return this.resumeRepository.save(r);
  }

  update(id: string, changes: Partial<Resume>) {
    return this.resumeRepository.update(id, changes as Parameters<typeof this.resumeRepository.update>[1]);
  }
}
