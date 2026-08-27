import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Job } from "./entities/job.entity";

const EXPANDED_MANUFACTURING_JOBS: Partial<Job>[] = [
  {
    title: "Senior Procurement Manager — Direct Materials",
    company: "Tata Steel",
    location: "Mumbai / Jamshedpur",
    salary: "25-35 LPA",
    description: "Lead strategic sourcing, vendor evaluation, rate contracts, and cost reduction for steel plant operations.",
    requirements: JSON.stringify(["Procurement", "SAP MM", "Strategic Sourcing", "Vendor Development", "8+ years"]),
    source: "tata_careers",
    sourceUrl: "https://www.tatasteel.com/careers/",
    matchScore: 95,
    isActive: true,
  },
  {
    title: "Supply Chain Lead — Integrated Plant Logistics",
    company: "JSW Steel",
    location: "Pune / Vijayanagar",
    salary: "22-30 LPA",
    description: "Own end-to-end supply chain planning, OTIF delivery compliance, raw material inventory, and rail freight logistics.",
    requirements: JSON.stringify(["Supply Chain", "Logistics", "OTIF", "Forecasting", "SAP", "6+ years"]),
    source: "jsw_careers",
    sourceUrl: "https://www.jsw.in/careers",
    matchScore: 88,
    isActive: true,
  },
  {
    title: "Deputy Manager — Purchase & SCM",
    company: "Bosch India",
    location: "Bangalore / Nashik",
    salary: "18-25 LPA",
    description: "Manage purchase orders, PPAP supplier clearance, price variance (PPV) control, and stores alignment.",
    requirements: JSON.stringify(["Purchase", "PPAP", "Vendor Management", "SAP MM", "5+ years"]),
    source: "bosch_careers",
    sourceUrl: "https://www.bosch.in/careers/",
    matchScore: 84,
    isActive: true,
  },
  {
    title: "Operations Manager — Industrial Automation",
    company: "Siemens India",
    location: "Aurangabad / Pune",
    salary: "24-35 LPA",
    description: "Lead factory shift operations, MES shopfloor tracking, lean kaizen, and ISO 9001/14001 compliance.",
    requirements: JSON.stringify(["Plant Operations", "MES", "Lean Manufacturing", "TPM", "8+ years"]),
    source: "siemens_careers",
    sourceUrl: "https://jobs.siemens.com/careers",
    matchScore: 90,
    isActive: true,
  },
  {
    title: "Plant Quality & Continuous Improvement Lead",
    company: "Mahindra & Mahindra",
    location: "Chakan, Pune",
    salary: "20-28 LPA",
    description: "Drive Six Sigma quality systems, root cause CAPA analysis, supplier audits, and scrap reduction on assembly lines.",
    requirements: JSON.stringify(["Quality Assurance", "Six Sigma", "CAPA", "TS 16949", "7+ years"]),
    source: "mahindra_careers",
    sourceUrl: "https://www.mahindra.com/careers",
    matchScore: 82,
    isActive: true,
  },
  {
    title: "Sourcing Specialist — Electrical & Electronics",
    company: "Schneider Electric",
    location: "Chennai / Bangalore",
    salary: "16-24 LPA",
    description: "Category procurement for electrical switchgear components, supplier risk mitigation, and dual-sourcing.",
    requirements: JSON.stringify(["Category Sourcing", "Negotiation", "Vendor Development", "5+ years"]),
    source: "schneider_careers",
    sourceUrl: "https://www.se.com/in/en/about-us/careers/",
    matchScore: 80,
    isActive: true,
  },
  {
    title: "Maintenance & Reliability Manager",
    company: "Hindalco Industries",
    location: "Renukoot / Belagavi",
    salary: "22-30 LPA",
    description: "Lead preventive, predictive, and breakdown maintenance for heavy industrial smelting and rolling assets.",
    requirements: JSON.stringify(["Maintenance", "TPM", "Vibration Analysis", "Reliability", "7+ years"]),
    source: "hindalco_careers",
    sourceUrl: "https://www.hindalco.com/careers",
    matchScore: 78,
    isActive: true,
  },
  {
    title: "Strategic Sourcing Manager — Battery & Cell SCM",
    company: "Ola Electric",
    location: "Krishnagiri / Bangalore",
    salary: "24-34 LPA",
    description: "Lead global sourcing for raw materials, battery components, vendor cost-out negotiations, and supplier QMS.",
    requirements: JSON.stringify(["Global Sourcing", "EV / Auto SCM", "Negotiation", "Vendor Development", "6+ years"]),
    source: "greenhouse_ats",
    sourceUrl: "https://boards.greenhouse.io/olaelectric",
    matchScore: 92,
    isActive: true,
  }
];

@Injectable()
export class JobService implements OnModuleInit {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async onModuleInit() {
    const count = await this.jobRepository.count();
    if (count === 0) {
      await this.jobRepository.save(
        EXPANDED_MANUFACTURING_JOBS.map((j) => this.jobRepository.create(j))
      );
    }
  }

  findAll(filters?: { source?: string; search?: string }) {
    const qb = this.jobRepository.createQueryBuilder("job");
    qb.where("job.isActive = :active", { active: true });
    if (filters?.source) {
      qb.andWhere("job.source = :source", { source: filters.source });
    }
    if (filters?.search) {
      qb.andWhere(
        "(LOWER(job.title) LIKE :search OR LOWER(job.company) LIKE :search OR LOWER(job.location) LIKE :search)",
        { search: `%${filters.search.toLowerCase()}%` }
      );
    }
    qb.orderBy("job.matchScore", "DESC");
    return qb.getMany();
  }

  findById(id: string) {
    return this.jobRepository.findOne({ where: { id } });
  }

  create(job: Partial<Job>) {
    const j = this.jobRepository.create(job);
    return this.jobRepository.save(j);
  }

  async batchCreate(jobs: Partial<Job>[]) {
    const entities = jobs.map((j) => this.jobRepository.create({ ...j, isActive: true }));
    return this.jobRepository.save(entities);
  }
}
