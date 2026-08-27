export type SuggestionSeverity = "high" | "medium" | "low";

export type ResumeSuggestion = {
  id: string;
  title: string;
  detail: string;
  severity: SuggestionSeverity;
  category: "ats" | "impact" | "skills" | "structure" | "manufacturing";
};

export type ParsedResume = {
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    /** Optional headshot as data URL (JPEG/PNG). Off for pure ATS Classic. */
    photoUrl?: string;
  };
  summary?: string;
  experience?: Array<{
    role?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    bullets?: string[];
  }>;
  education?: Array<{ degree?: string; institution?: string; year?: string }>;
  skills?: string[];
  gaps?: string[];
};

export type ResumeRecord = {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  rawText?: string;
  aiScore?: number;
  parsedData?: ParsedResume;
  suggestions?: ResumeSuggestion[];
  atsScorecard?: import("@/lib/resume/ats-scorecard").AtsScorecard;
  keywordGap?: import("@/lib/resume/ats-scorecard").KeywordGapReport;
  status: "uploaded" | "extracting" | "analyzing" | "parsed" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type ResumeVersion = {
  id: string;
  resumeId: string;
  userId: string;
  name: string;
  kind: "improved" | "job_tailored" | "cover_letter" | "draft";
  contentMarkdown: string;
  aiScore?: number;
  optimizationNotes?: string;
  targetJobId?: string;
  createdAt: string;
};

export type JobSourceKind = "live" | "beachhead" | "paste" | "career_page" | "listing";

export type JobRecord = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  requirements: string[];
  source: string;
  sourceUrl?: string;
  /** live | beachhead | paste | career_page | listing */
  sourceKind?: JobSourceKind;
  /** Inferred role family for admission / fill */
  roleFamily?: import("@/lib/product/targets").RoleFamily;
  /** ISO date from JobPosting.datePosted when known */
  postedAt?: string;
  /** Candidate-facing publisher/platform attribution */
  sourceLabel?: string;
  sourcePlatform?: string;
  sourcePublisher?: string;
  sourceOfficial?: boolean;
  /** When CareerOS discovered this exact URL */
  discoveredAt?: string;
  /** Parsed notice requirement from JD (employer-side) */
  noticeDays?: number;
  /** Parsed LPA band from salary/JD when known */
  salaryLpaMin?: number;
  salaryLpaMax?: number;
  matchScore?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationRecord = {
  id: string;
  userId: string;
  jobId: string;
  resumeVersionId?: string;
  coverLetter?: string;
  status: string;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
  job?: JobRecord;
};

export type IndustryPackId = "manufacturing_scm" | "healthcare" | "general";

/** Candidate hunt targets — drives digest ranking + match rubric */
export type CareerTargets = {
  targetRole: string;
  yearsExperience: number;
  cities: string[];
  ctcMinLpa?: number;
  ctcMaxLpa?: number;
  noticeDays?: number;
  industryPack: IndustryPackId;
  openToRelocate?: boolean;
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  plan: string;
  avatarUrl?: string;
  careerTargets?: CareerTargets;
  createdAt: string;
  updatedAt: string;
};

export type QueueItemStatus = "queued" | "prepared" | "opened" | "approved" | "dismissed";

export type MatchRubricSnapshot = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  stars: number;
  why: string[];
  gaps: string[];
  action: string;
  unknowns?: string[];
};

export type ApplicationQueueItem = {
  id: string;
  userId: string;
  jobId: string;
  digestDate: string;
  matchScore: number;
  status: QueueItemStatus;
  digestSlot?: DigestSlotName;
  matchRubric?: MatchRubricSnapshot;
  tailoredMarkdown?: string;
  coverLetter?: string;
  resumeVersionId?: string;
  notes?: string;
  preparedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  job?: JobRecord;
  applyUrl?: string;
};

export type DigestSlotName = "morning" | "midday" | "evening";

export type DigestRunRecord = {
  id: string;
  userId: string;
  digestDate: string;
  slot: DigestSlotName;
  createdCount: number;
  ranAt: string;
  sources?: {
    live: number;
    beachhead: number;
    pasted?: number;
  };
};

/** Lightweight per-user value counters for dashboard KPIs */
export type CandidateValueStats = {
  userId: string;
  liveQueued: number;
  beachheadQueued: number;
  pastedQueued: number;
  packetsPrepared: number;
  confirmedApplies: number;
  interviews: number;
  updatedAt: string;
};

export type QueueNotesPayload = {
  rubric?: MatchRubricSnapshot;
  tailorNotes?: string;
  action?: string;
};
