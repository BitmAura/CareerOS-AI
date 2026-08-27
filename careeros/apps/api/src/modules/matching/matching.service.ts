import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job } from "../jobs/entities/job.entity";
import { Resume } from "../resume/entities/resume.entity";

export type MatchGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface GradedJobMatch {
  job: Job;
  matchScore: number;
  matchGrade: MatchGrade;
  matchWhy: string[];
  matchGaps: string[];
  tailorAdvice: string;
}

const SCM_LEXICON = [
  "procurement", "purchase", "sourcing", "strategic sourcing",
  "vendor management", "vendor development", "negotiation", "rate contract",
  "supply chain", "logistics", "inventory", "otif", "mrp", "bom", "forecasting",
  "sap mm", "sap", "erp", "quality", "six sigma", "lean", "tpm", "kaizen", "5s",
  "ppc", "iso", "production", "maintenance", "cost reduction", "capex", "opex"
];

function scoreToGrade(score: number): MatchGrade {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Resume)
    private readonly resumeRepository: Repository<Resume>,
  ) {}

  async matchJobs(userId: string): Promise<GradedJobMatch[]> {
    // 1. Fetch user's latest parsed resume
    const resume = await this.resumeRepository.findOne({
      where: { userId },
      order: { createdAt: "DESC" },
    });

    let candidateSkills: string[] = [];
    let candidateText = "";

    if (resume?.parsedData) {
      try {
        const pd = typeof resume.parsedData === "string" ? JSON.parse(resume.parsedData) : resume.parsedData;
        candidateSkills = (pd.skills || []).map((s: string) => s.toLowerCase());
        candidateText = JSON.stringify(pd).toLowerCase();
      } catch {
        candidateText = (resume.parsedData || "").toLowerCase();
      }
    }

    // 2. Fetch all active jobs
    const jobs = await this.jobRepository.find({
      where: { isActive: true },
      order: { createdAt: "DESC" },
    });

    // 3. Compute rubric for each job
    const results: GradedJobMatch[] = jobs.map((job) => {
      let requirements: string[] = [];
      try {
        requirements = Array.isArray(job.requirements)
          ? job.requirements
          : JSON.parse(job.requirements || "[]");
      } catch {
        requirements = (job.requirements || "").split(",").map((r) => r.trim()).filter(Boolean);
      }

      const jobReqLower = requirements.map((r) => r.toLowerCase());
      const jobDescLower = `${job.title} ${job.description} ${jobReqLower.join(" ")}`.toLowerCase();

      // Overlap calculation
      const matchedReqs = jobReqLower.filter((r) =>
        candidateSkills.some((cs) => cs.includes(r) || r.includes(cs)) || candidateText.includes(r)
      );
      const missingReqs = jobReqLower.filter((r) => !matchedReqs.includes(r));

      // SCM lexicon hits
      const sharedLexicon = SCM_LEXICON.filter(
        (kw) => jobDescLower.includes(kw) && candidateText.includes(kw)
      );

      // Score components:
      // - Requirement overlap: up to 50 pts
      // - SCM Lexicon overlap: up to 35 pts
      // - Base active baseline: 15 pts
      const reqRatio = jobReqLower.length > 0 ? matchedReqs.length / jobReqLower.length : 0.6;
      const reqScore = Math.round(reqRatio * 50);
      const lexScore = Math.min(35, sharedLexicon.length * 6);
      const baseScore = 15;

      const totalScore = Math.min(98, Math.max(30, reqScore + lexScore + baseScore));
      const grade = scoreToGrade(totalScore);

      const matchWhy = [
        matchedReqs.length > 0
          ? `Strong overlap on ${matchedReqs.slice(0, 2).join(" & ")}`
          : "Matches your target industry domain",
        sharedLexicon.length > 0
          ? `Verified domain expertise in ${sharedLexicon.slice(0, 2).join(", ")}`
          : "Aligns with manufacturing career track",
      ];

      const matchGaps = missingReqs.length > 0
        ? missingReqs.slice(0, 3)
        : ["Highlight plant-specific metrics and cost-out wins"];

      const tailorAdvice = missingReqs.length > 0
        ? `Ensure your resume references experience with ${missingReqs.slice(0, 2).join(" and ")}.`
        : "Lead with your quantifiable OTIF, cost reduction, and vendor management achievements.";

      return {
        job,
        matchScore: totalScore,
        matchGrade: grade,
        matchWhy,
        matchGaps,
        tailorAdvice,
      };
    });

    // Sort descending by match score
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}
