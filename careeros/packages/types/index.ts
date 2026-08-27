export type Plan = "starter" | "professional" | "premium";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  userId: string;
  phone?: string;
  location?: string;
  summary?: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  careerGoals?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkExperience {
  id: string;
  profileId: string;
  role: string;
  company: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  profileId: string;
  degree: string;
  institution: string;
  year: string;
  score?: string;
}

export interface Skill {
  id: string;
  profileId: string;
  name: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  aiScore?: number;
  parsedData?: Record<string, unknown>;
  status: "uploaded" | "parsing" | "parsed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  userId: string;
  name: string;
  fileUrl: string;
  aiScore?: number;
  optimizationNotes?: string;
  targetJobId?: string;
  createdAt: Date;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  requirements: string[];
  source: "naukri" | "foundit" | "linkedin" | "company" | "manual";
  sourceUrl?: string;
  externalId?: string;
  matchScore?: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeVersionId?: string;
  coverLetter?: string;
  status: "applied" | "shortlisted" | "interview" | "offer" | "rejected" | "withdrawn";
  appliedAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  userId: string;
  jobId: string;
  type: "phone" | "video" | "in_person" | "technical" | "hr";
  scheduledAt: Date;
  duration?: number;
  location?: string;
  meetingLink?: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  feedback?: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "job_match" | "application_update" | "interview_reminder" | "system";
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  status: "active" | "cancelled" | "expired" | "trial";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingEvent {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  provider: string;
  providerEventId?: string;
  createdAt: Date;
}
