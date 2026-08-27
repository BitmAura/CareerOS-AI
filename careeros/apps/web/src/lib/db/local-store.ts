import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type {
  ApplicationQueueItem,
  ApplicationRecord,
  CandidateValueStats,
  DigestRunRecord,
  JobRecord,
  ResumeRecord,
  ResumeVersion,
  UserRecord,
} from "./types";
import { inferRoleFamilyFromText } from "@/lib/product/targets";

type DbShape = {
  users: UserRecord[];
  resumes: ResumeRecord[];
  versions: ResumeVersion[];
  jobs: JobRecord[];
  applications: ApplicationRecord[];
  queue: ApplicationQueueItem[];
  digestRuns: DigestRunRecord[];
  valueStats: CandidateValueStats[];
  files: Record<string, string>;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "store.json");

function seed(
  row: Omit<JobRecord, "id" | "createdAt" | "updatedAt" | "roleFamily" | "sourceKind" | "salaryLpaMin" | "salaryLpaMax"> & {
    roleFamily?: JobRecord["roleFamily"];
    sourceKind?: JobRecord["sourceKind"];
  },
): Omit<JobRecord, "id" | "createdAt" | "updatedAt"> {
  const salaryMatch = (row.salary || "").match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  return {
    ...row,
    sourceKind: row.sourceKind || (row.source === "beachhead" ? "beachhead" : "career_page"),
    roleFamily: row.roleFamily || inferRoleFamilyFromText(`${row.title} ${row.description}`),
    salaryLpaMin: salaryMatch ? Number(salaryMatch[1]) : undefined,
    salaryLpaMax: salaryMatch ? Number(salaryMatch[2]) : undefined,
  };
}

/** Beachhead + career-page style seeds (no LinkedIn scrape). Family-tagged for fill. */
export const BEACHHEAD: Omit<JobRecord, "id" | "createdAt" | "updatedAt">[] = [
  seed({
    title: "Senior Procurement Manager",
    company: "Tata Steel",
    location: "Mumbai",
    salary: "25-35 LPA",
    description:
      "Lead strategic sourcing and vendor management for steel manufacturing operations across India. Notice period typically 60–90 days.",
    requirements: ["Procurement", "SAP MM", "Negotiation", "8+ years"],
    source: "beachhead",
    sourceUrl: "https://www.tatasteel.com/careers/",
    matchScore: 95,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Supply Chain Lead",
    company: "JSW Steel",
    location: "Pune",
    salary: "22-30 LPA",
    description:
      "Own end-to-end supply chain planning for integrated steel plants with focus on cost and OTIF.",
    requirements: ["Supply Chain", "Logistics", "Forecasting", "6+ years"],
    source: "beachhead",
    sourceUrl: "https://www.jswsteel.in/careers/",
    matchScore: 88,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Purchase Executive",
    company: "Vedanta",
    location: "Chennai",
    salary: "18-25 LPA",
    description:
      "Manage purchase orders, supplier follow-ups, and inventory alignment for plant operations.",
    requirements: ["Purchase", "Vendor Management", "MS Office", "4+ years"],
    source: "beachhead",
    sourceUrl: "https://www.vedantalimited.com/eng/careers.php",
    matchScore: 82,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Quality Engineer",
    company: "Bosch",
    location: "Bangalore",
    salary: "12-18 LPA",
    description:
      "Drive quality systems, root-cause analysis, and continuous improvement on the shop floor.",
    requirements: ["Quality", "Six Sigma", "ISO", "3+ years"],
    source: "beachhead",
    sourceUrl: "https://www.bosch.in/careers/",
    matchScore: 78,
    isActive: true,
    roleFamily: "plant_ops",
  }),
  seed({
    title: "Maintenance Manager",
    company: "Hindalco",
    location: "Renukoot",
    salary: "20-28 LPA",
    description:
      "Lead preventive and breakdown maintenance for aluminum manufacturing assets.",
    requirements: ["Maintenance", "TPM", "Mechanical", "7+ years"],
    source: "beachhead",
    sourceUrl: "https://www.hindalco.com/careers",
    matchScore: 74,
    isActive: true,
    roleFamily: "plant_ops",
  }),
  seed({
    title: "Production Supervisor",
    company: "Siemens",
    location: "Aurangabad",
    salary: "10-15 LPA",
    description:
      "Supervise shift production targets, safety, and manpower for industrial equipment lines.",
    requirements: ["Production", "Lean", "Team Leadership", "5+ years"],
    source: "beachhead",
    sourceUrl: "https://www.siemens.com/in/en/company/jobs.html",
    matchScore: 70,
    isActive: true,
    roleFamily: "plant_ops",
  }),
  seed({
    title: "Materials Manager",
    company: "Larsen & Toubro",
    location: "Vadodara",
    salary: "20-28 LPA",
    description:
      "Own materials planning, stores, and vendor coordination for heavy engineering projects.",
    requirements: ["Materials", "Inventory", "SAP", "Procurement", "6+ years"],
    source: "career_page",
    sourceUrl: "https://www.larsentoubro.com/corporate/careers/",
    matchScore: 86,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Sourcing Specialist — Indirects",
    company: "Asian Paints",
    location: "Mumbai",
    salary: "14-20 LPA",
    description:
      "Category ownership for MRO and services sourcing with savings and compliance KPIs.",
    requirements: ["Sourcing", "Negotiation", "Vendor Management", "5+ years"],
    source: "career_page",
    sourceUrl: "https://www.asianpaints.com/careers.html",
    matchScore: 84,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Logistics Manager",
    company: "Amul",
    location: "Anand",
    salary: "16-22 LPA",
    description:
      "Manage inbound/outbound logistics, cold-chain partners, and distribution OTIF.",
    requirements: ["Logistics", "Supply Chain", "OTIF", "6+ years"],
    source: "career_page",
    sourceUrl: "https://amul.com/m/careers",
    matchScore: 80,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "EHS Manager",
    company: "Reliance Industries",
    location: "Jamnagar",
    salary: "22-32 LPA",
    description:
      "Own plant EHS systems, audits, and contractor safety for refining/petrochem assets.",
    requirements: ["EHS", "Safety", "ISO", "Manufacturing", "8+ years"],
    source: "career_page",
    sourceUrl: "https://www.ril.com/Careers.aspx",
    matchScore: 76,
    isActive: true,
    roleFamily: "plant_ops",
  }),
  seed({
    title: "Continuous Improvement Lead",
    company: "Maruti Suzuki",
    location: "Gurgaon",
    salary: "18-25 LPA",
    description:
      "Drive lean / TPM kaizen across assembly lines with measurable productivity gains.",
    requirements: ["Lean", "TPM", "Kaizen", "Production", "6+ years"],
    source: "career_page",
    sourceUrl: "https://www.marutisuzuki.com/corporate/careers",
    matchScore: 79,
    isActive: true,
    roleFamily: "plant_ops",
  }),
  seed({
    title: "Category Manager — Direct Materials",
    company: "Mahindra & Mahindra",
    location: "Chennai",
    salary: "22-32 LPA",
    description:
      "Own strategic categories for auto components: RFQ, negotiation, dual-sourcing, and cost-out with plant stakeholders.",
    requirements: ["Category Management", "Procurement", "Negotiation", "SAP", "8+ years"],
    source: "career_page",
    sourceUrl: "https://www.mahindra.com/careers",
    matchScore: 90,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Import Procurement Specialist",
    company: "Godrej & Boyce",
    location: "Mumbai",
    salary: "14-20 LPA",
    description:
      "Manage overseas vendors, LC/documentation, lead times, and landed cost for capital and MRO imports.",
    requirements: ["Import", "Procurement", "Customs", "Vendor Management", "5+ years"],
    source: "career_page",
    sourceUrl: "https://www.godrej.com/careers",
    matchScore: 83,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Vendor Development Manager",
    company: "Bharat Forge",
    location: "Pune",
    salary: "18-26 LPA",
    description:
      "Qualify and develop forging/machining suppliers; PPAP, quality gates, and capacity ramp for OEM programs.",
    requirements: ["Vendor Development", "Quality", "Procurement", "Manufacturing", "7+ years"],
    source: "career_page",
    sourceUrl: "https://www.bharatforge.com/careers/careers",
    matchScore: 87,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Commodity Buyer — Steel & Alloys",
    company: "Tata Motors",
    location: "Pune",
    salary: "16-24 LPA",
    description:
      "Buy steel/alloys for vehicle programs; hedge coordination, supplier scorecards, and should-cost models.",
    requirements: ["Commodity", "Procurement", "Steel", "Negotiation", "6+ years"],
    source: "career_page",
    sourceUrl: "https://www.tatamotors.com/careers/",
    matchScore: 89,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Purchase Manager — Plant Consumables",
    company: "Jindal Steel & Power",
    location: "Angul",
    salary: "15-22 LPA",
    description:
      "Own plant consumables and MRO buys with OTIF, rate contracts, and emergency purchase control.",
    requirements: ["Purchase", "MRO", "Vendor Management", "SAP", "7+ years"],
    source: "career_page",
    sourceUrl: "https://www.jindalsteelpower.com/careers.html",
    matchScore: 84,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Supply Planning Manager",
    company: "Dr. Reddy's Laboratories",
    location: "Hyderabad",
    salary: "22-30 LPA",
    description:
      "SIOP / supply planning for pharma manufacturing: inventory health, OTIF, and cross-plant coordination.",
    requirements: ["Supply Chain", "Planning", "Inventory", "SAP", "8+ years"],
    source: "career_page",
    sourceUrl: "https://www.drreddys.com/careers",
    matchScore: 80,
    isActive: true,
    roleFamily: "procurement",
  }),
  // Sales family seeds — prevent wrong-family padding for sales hunters
  seed({
    title: "Regional Sales Manager — Industrial",
    company: "Schaeffler India",
    location: "Pune",
    salary: "22-32 LPA",
    description:
      "Own B2B industrial sales for bearings and automotive aftermarket across West India. Drive channel, key accounts, and revenue growth. 8+ years sales experience. Notice period 60 days preferred.",
    requirements: ["Sales", "Key Account", "Channel", "B2B", "8+ years"],
    source: "beachhead",
    sourceUrl: "https://www.schaeffler.co.in/en/career/",
    matchScore: 91,
    isActive: true,
    roleFamily: "sales",
  }),
  seed({
    title: "Key Account Manager — Manufacturing OEM",
    company: "SKF India",
    location: "Mumbai",
    salary: "18-28 LPA",
    description:
      "Manage strategic OEM and institutional accounts for industrial products. Grow wallet share, negotiate commercial terms, and coordinate with distributors. CTC 18-28 LPA.",
    requirements: ["Key Account", "Sales", "OEM", "Negotiation", "6+ years"],
    source: "beachhead",
    sourceUrl: "https://www.skf.com/in/careers",
    matchScore: 88,
    isActive: true,
    roleFamily: "sales",
  }),
  seed({
    title: "Area Sales Manager — Building Materials",
    company: "Ultratech Cement",
    location: "Hyderabad",
    salary: "16-24 LPA",
    description:
      "Lead territory sales for cement and building solutions via dealer/distributor network. Hit volume and collection targets with institutional project sales.",
    requirements: ["Area Sales", "Channel", "Distributor", "Institutional", "5+ years"],
    source: "beachhead",
    sourceUrl: "https://www.ultratechcement.com/corporate/career/jobs-at-ultratech",
    matchScore: 85,
    isActive: true,
    roleFamily: "sales",
  }),
  seed({
    title: "Business Development Manager — Capex Equipment",
    company: "Siemens",
    location: "Bangalore",
    salary: "20-30 LPA",
    description:
      "Drive commercial growth for industrial equipment and digital offerings. Hunt new manufacturing accounts and expand existing revenue. 7+ years B2B sales.",
    requirements: ["Business Development", "Sales", "Commercial", "Manufacturing", "7+ years"],
    source: "beachhead",
    sourceUrl: "https://www.siemens.com/in/en/company/jobs.html",
    matchScore: 86,
    isActive: true,
    roleFamily: "sales",
  }),
  seed({
    title: "Channel Sales Manager — Auto Components",
    company: "Bosch",
    location: "Chennai",
    salary: "18-26 LPA",
    description:
      "Own aftermarket and OEM channel partners for auto components. Drive distributor productivity and secondary sales.",
    requirements: ["Channel", "Sales", "Distributor", "Automotive", "6+ years"],
    source: "beachhead",
    sourceUrl: "https://www.bosch.in/careers/",
    matchScore: 84,
    isActive: true,
    roleFamily: "sales",
  }),
  // OEM career-page beachhead — ABB / Schneider / Siemens (Workday depth also scanned live)
  seed({
    title: "Sales Manager — Electrification",
    company: "ABB India",
    location: "Pune",
    salary: "22-32 LPA",
    description:
      "Drive B2B sales for electrification and industrial automation products across West India. Key accounts, channel, and institutional projects. 8+ years industrial sales. Notice ~60 days.",
    requirements: ["Sales", "Key Account", "Channel", "Industrial", "8+ years"],
    source: "beachhead",
    sourceUrl: "https://careers.abb/global/en/search-results",
    sourceLabel: "Official ABB Careers",
    sourceOfficial: true,
    matchScore: 90,
    isActive: true,
    roleFamily: "sales",
  }),
  seed({
    title: "Purchase Manager — Direct Materials",
    company: "Schneider Electric",
    location: "Bangalore",
    salary: "20-30 LPA",
    description:
      "Own strategic sourcing for direct materials supporting manufacturing plants. SAP MM, vendor negotiation, cost-out, and OTIF. CTC 20-30 LPA. Notice 60–90 days.",
    requirements: ["Procurement", "SAP MM", "Negotiation", "Sourcing", "8+ years"],
    source: "beachhead",
    sourceUrl: "https://careers.se.com/jobs",
    sourceLabel: "Official Schneider Careers",
    sourceOfficial: true,
    matchScore: 92,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Regional Sales Manager — Digital Industries",
    company: "Siemens",
    location: "Mumbai",
    salary: "24-34 LPA",
    description:
      "Lead regional revenue for Digital Industries / factory automation. Hunt manufacturing accounts, expand installed base, and coach channel partners. 8–12 years B2B sales.",
    requirements: ["Sales", "B2B", "Channel", "Manufacturing", "8+ years"],
    source: "beachhead",
    sourceUrl: "https://jobs.siemens.com/",
    sourceLabel: "Official Siemens Jobs",
    sourceOfficial: true,
    matchScore: 91,
    isActive: true,
    roleFamily: "sales",
  }),
  seed({
    title: "Plant Procurement Lead",
    company: "Johnson Controls",
    location: "Hyderabad",
    salary: "18-26 LPA",
    description:
      "Lead plant procurement for HVAC manufacturing: MRO, direct materials, rate contracts, and vendor scorecards. 7+ years purchase experience.",
    requirements: ["Purchase", "Procurement", "Vendor", "Plant", "7+ years"],
    source: "beachhead",
    sourceUrl: "https://jci.wd5.myworkdayjobs.com/JCI",
    sourceLabel: "Johnson Controls via Workday",
    sourceOfficial: true,
    matchScore: 87,
    isActive: true,
    roleFamily: "procurement",
  }),
  seed({
    title: "Area Sales Manager — Elevators & Escalators",
    company: "KONE",
    location: "Chennai",
    salary: "16-24 LPA",
    description:
      "Own territory sales for new equipment and modernization. Work with consultants, builders, and channel. 5+ years capital equipment sales.",
    requirements: ["Area Sales", "B2B", "Channel", "Projects", "5+ years"],
    source: "beachhead",
    sourceUrl: "https://kone.wd3.myworkdayjobs.com/Careers",
    sourceLabel: "KONE via Workday",
    sourceOfficial: true,
    matchScore: 86,
    isActive: true,
    roleFamily: "sales",
  }),
];

async function ensureDb(): Promise<DbShape> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      users: parsed.users || [],
      resumes: parsed.resumes || [],
      versions: parsed.versions || [],
      jobs: parsed.jobs || [],
      applications: parsed.applications || [],
      queue: parsed.queue || [],
      digestRuns: parsed.digestRuns || [],
      valueStats: parsed.valueStats || [],
      files: parsed.files || {},
    };
  } catch {
    const now = new Date().toISOString();
    const db: DbShape = {
      users: [],
      resumes: [],
      versions: [],
      jobs: BEACHHEAD.map((j) => ({
        ...j,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      })),
      applications: [],
      queue: [],
      digestRuns: [],
      valueStats: [],
      files: {},
    };
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
}

async function save(db: DbShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

function withJob(item: ApplicationQueueItem, jobs: JobRecord[]): ApplicationQueueItem {
  return { ...item, job: jobs.find((j) => j.id === item.jobId) };
}

async function ensureBeachheadJobs(db: DbShape) {
  const now = new Date().toISOString();
  let added = false;
  for (const seed of BEACHHEAD) {
    const exists = db.jobs.some(
      (j) =>
        j.title.toLowerCase() === seed.title.toLowerCase() &&
        j.company.toLowerCase() === seed.company.toLowerCase(),
    );
    if (!exists) {
      db.jobs.push({ ...seed, id: randomUUID(), createdAt: now, updatedAt: now });
      added = true;
    }
  }
  if (db.jobs.length === 0) {
    db.jobs = BEACHHEAD.map((j) => ({
      ...j,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));
    added = true;
  }
  if (added) await save(db);
}

export const localStore = {
  async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    const db = await ensureDb();
    if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("Email already registered");
    }
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      plan: "starter",
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(user);
    await save(db);
    return user;
  },

  async findUserByEmail(email: string) {
    const db = await ensureDb();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findUserById(id: string) {
    const db = await ensureDb();
    return db.users.find((u) => u.id === id) || null;
  },

  async updateUser(id: string, patch: Partial<UserRecord>) {
    const db = await ensureDb();
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    const next = { ...db.users[idx], ...patch, updatedAt: new Date().toISOString() };
    // never allow id overwrite via patch
    next.id = db.users[idx].id;
    next.email = db.users[idx].email;
    next.createdAt = db.users[idx].createdAt;
    if (patch.passwordHash === undefined) next.passwordHash = db.users[idx].passwordHash;
    db.users[idx] = next;
    await save(db);
    return db.users[idx];
  },

  async listJobs() {
    const db = await ensureDb();
    await ensureBeachheadJobs(db);
    const fresh = await ensureDb();
    return fresh.jobs
      .filter((j) => j.isActive)
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  },

  async getJob(id: string) {
    const db = await ensureDb();
    return db.jobs.find((j) => j.id === id) || null;
  },

  async createJob(job: Omit<JobRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    const row: JobRecord = {
      ...job,
      id: job.id || randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    db.jobs.push(row);
    await save(db);
    return row;
  },

  async listResumes(userId: string) {
    const db = await ensureDb();
    return db.resumes
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getResume(id: string) {
    const db = await ensureDb();
    return db.resumes.find((r) => r.id === id) || null;
  },

  async createResume(resume: Omit<ResumeRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    const row: ResumeRecord = {
      ...resume,
      id: resume.id || randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    db.resumes.push(row);
    await save(db);
    return row;
  },

  async updateResume(id: string, patch: Partial<ResumeRecord>) {
    const db = await ensureDb();
    const idx = db.resumes.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    db.resumes[idx] = {
      ...db.resumes[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await save(db);
    return db.resumes[idx];
  },

  async saveFile(id: string, base64: string) {
    const db = await ensureDb();
    db.files[id] = base64;
    await save(db);
  },

  async getFile(id: string) {
    const db = await ensureDb();
    return db.files[id] || null;
  },

  async listVersions(resumeId: string) {
    const db = await ensureDb();
    return db.versions
      .filter((v) => v.resumeId === resumeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createVersion(version: Omit<ResumeVersion, "id" | "createdAt"> & { id?: string }) {
    const db = await ensureDb();
    const row: ResumeVersion = {
      ...version,
      id: version.id || randomUUID(),
      createdAt: new Date().toISOString(),
    };
    db.versions.push(row);
    await save(db);
    return row;
  },

  async listApplications(userId: string) {
    const db = await ensureDb();
    return db.applications
      .filter((a) => a.userId === userId)
      .map((a) => ({ ...a, job: db.jobs.find((j) => j.id === a.jobId) }))
      .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  },

  async findApplication(userId: string, jobId: string) {
    const db = await ensureDb();
    return db.applications.find((a) => a.userId === userId && a.jobId === jobId) || null;
  },

  async getApplication(id: string) {
    const db = await ensureDb();
    const row = db.applications.find((a) => a.id === id);
    if (!row) return null;
    return { ...row, job: db.jobs.find((j) => j.id === row.jobId) };
  },

  async createApplication(input: {
    userId: string;
    jobId: string;
    coverLetter?: string;
    resumeVersionId?: string;
    notes?: string;
    status?: string;
  }) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    const row: ApplicationRecord = {
      id: randomUUID(),
      userId: input.userId,
      jobId: input.jobId,
      coverLetter: input.coverLetter,
      resumeVersionId: input.resumeVersionId,
      status: input.status || "applied",
      notes: input.notes,
      appliedAt: now,
      updatedAt: now,
    };
    db.applications.push(row);
    await save(db);
    return { ...row, job: db.jobs.find((j) => j.id === input.jobId) };
  },

  async updateApplication(id: string, patch: Partial<ApplicationRecord>) {
    const db = await ensureDb();
    const idx = db.applications.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    const { job: _ignored, ...rest } = patch as Partial<ApplicationRecord> & { job?: unknown };
    void _ignored;
    db.applications[idx] = {
      ...db.applications[idx],
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    await save(db);
    return {
      ...db.applications[idx],
      job: db.jobs.find((j) => j.id === db.applications[idx].jobId),
    };
  },

  async listQueue(userId: string, digestDate?: string) {
    const db = await ensureDb();
    return db.queue
      .filter((q) => q.userId === userId && (!digestDate || q.digestDate === digestDate))
      .map((q) => withJob(q, db.jobs))
      .sort((a, b) => b.matchScore - a.matchScore);
  },

  async getQueueItem(id: string) {
    const db = await ensureDb();
    const item = db.queue.find((q) => q.id === id);
    return item ? withJob(item, db.jobs) : null;
  },

  async createQueueItem(
    item: Omit<ApplicationQueueItem, "id" | "createdAt" | "updatedAt" | "job"> & { id?: string },
  ) {
    const db = await ensureDb();
    const now = new Date().toISOString();
    const row: ApplicationQueueItem = {
      ...item,
      id: item.id || randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    db.queue.push(row);
    await save(db);
    return withJob(row, db.jobs);
  },

  async updateQueueItem(id: string, patch: Partial<ApplicationQueueItem>) {
    const db = await ensureDb();
    const idx = db.queue.findIndex((q) => q.id === id);
    if (idx < 0) return null;
    const { job: _ignored, ...rest } = patch;
    void _ignored;
    db.queue[idx] = {
      ...db.queue[idx],
      ...rest,
      updatedAt: new Date().toISOString(),
    };
    await save(db);
    return withJob(db.queue[idx], db.jobs);
  },

  async listDigestRuns(userId: string, digestDate: string) {
    const db = await ensureDb();
    return db.digestRuns
      .filter((r) => r.userId === userId && r.digestDate === digestDate)
      .sort((a, b) => a.ranAt.localeCompare(b.ranAt));
  },

  async createDigestRun(run: Omit<DigestRunRecord, "id"> & { id?: string }) {
    const db = await ensureDb();
    const row: DigestRunRecord = {
      ...run,
      id: run.id || randomUUID(),
    };
    db.digestRuns.push(row);
    await save(db);
    return row;
  },

  async getValueStats(userId: string): Promise<CandidateValueStats> {
    const db = await ensureDb();
    const existing = db.valueStats.find((v) => v.userId === userId);
    if (existing) return existing;
    return {
      userId,
      liveQueued: 0,
      beachheadQueued: 0,
      pastedQueued: 0,
      packetsPrepared: 0,
      confirmedApplies: 0,
      interviews: 0,
      updatedAt: new Date().toISOString(),
    };
  },

  async bumpValueStats(
    userId: string,
    delta: Partial<
      Omit<CandidateValueStats, "userId" | "updatedAt">
    >,
  ): Promise<CandidateValueStats> {
    const db = await ensureDb();
    const idx = db.valueStats.findIndex((v) => v.userId === userId);
    const base: CandidateValueStats =
      idx >= 0
        ? db.valueStats[idx]
        : {
            userId,
            liveQueued: 0,
            beachheadQueued: 0,
            pastedQueued: 0,
            packetsPrepared: 0,
            confirmedApplies: 0,
            interviews: 0,
            updatedAt: new Date().toISOString(),
          };
    const next: CandidateValueStats = {
      ...base,
      liveQueued: base.liveQueued + (delta.liveQueued || 0),
      beachheadQueued: base.beachheadQueued + (delta.beachheadQueued || 0),
      pastedQueued: base.pastedQueued + (delta.pastedQueued || 0),
      packetsPrepared: base.packetsPrepared + (delta.packetsPrepared || 0),
      confirmedApplies: base.confirmedApplies + (delta.confirmedApplies || 0),
      interviews: base.interviews + (delta.interviews || 0),
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) db.valueStats[idx] = next;
    else db.valueStats.push(next);
    await save(db);
    return next;
  },
};
