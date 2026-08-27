# CareerOS AI – Founder Blueprint (Master PRD v1)

> Working Name: **CareerOS AI**
>
> Version: **0.2**
>
> Status: Founder Blueprint (Updated)
>
> Purpose: This document is the single source of truth for AI coding tools and engineering teams.

---

# 1. Vision

Build India's most trusted AI Career Operating System that helps professionals discover better opportunities, optimize applications, increase interview rates, and accelerate career growth.

---

# 2. Mission

Enable busy professionals to switch jobs with minimal manual effort by combining AI, automation, and career intelligence.

---

# 3. Long-Term Goal (10 Years)

- 1,000,000+ registered professionals
- 100,000+ successful job switches
- Multi-country support
- Candidate platform + recruiter platform + enterprise hiring suite
- AI-powered career operating system

---

# 4. Initial Beachhead Market

Target Segment:
- Manufacturing professionals

Initial companies:
- JSW Steel
- Tata Steel
- Vedanta
- Hindalco
- Bosch
- Volvo
- Toyota
- ABB
- Siemens

Target roles:
- Purchase
- Procurement
- Supply Chain
- Mechanical
- Production
- Quality
- Maintenance

---

# 5. Revenue Roadmap

## Phase 1
Founding customers (concierge assisted)

Goal:
- 20 customers
- ₹10,000/month
- Monthly Revenue: ₹2,00,000

## Phase 2

Subscription SaaS

Starter
- ₹999/month

Professional
- ₹2,999/month

Premium
- ₹5,999+

## Future

- Recruiter subscriptions
- Hiring success fees
- Enterprise licenses
- API licensing
- Analytics products

---

# 6. ARR Targets

Year 1
- ₹25L–50L ARR

Year 2
- ₹1Cr–3Cr ARR

Year 3
- ₹10Cr ARR

Year 5
- ₹50Cr+ ARR

---

# 7. Product Principles

Every feature must improve at least one:

- Interview rate
- Salary growth
- Time saved
- Reduced manual work
- Career visibility

---

# 8. Core Product Engines

1. Identity Engine
2. Career Profile Engine
3. Resume Intelligence Engine
4. Job Discovery Engine
5. Job Matching Engine
6. Resume Optimization Engine
7. Cover Letter Engine
8. Application Engine
9. Notification Engine
10. Analytics Engine
11. Interview Engine
12. Billing Engine
13. Admin Engine

---

# 9. High-Level Architecture

Presentation Layer

- Web
- Mobile (future)
- Admin
- Recruiter Portal

↓

API Gateway

↓

Business Services

↓

AI Services

↓

Automation Workers

↓

Databases / Storage

↓

Infrastructure

---

# 10. Frontend

Framework
- Next.js
- React
- TypeScript

UI
- Tailwind CSS
- shadcn/ui
- Ant Design (AntD) — for Admin and internal ERP-style panels (see Section 25)

Libraries
- TanStack Query
- React Hook Form
- Zod
- Zustand
- Recharts

---

# 11. Backend

Framework
- NestJS

Services

- Auth
- Users
- Resume
- Jobs
- Matching
- Applications
- Notifications
- Analytics
- Billing
- Admin

---

# 12. Database

Primary
- PostgreSQL (via Supabase)

Cache
- Redis

Vector Search
- pgvector (built into Supabase)

Storage
- Supabase Storage

Example tables

- users
- profiles
- resumes
- resume_versions
- skills
- companies
- jobs
- applications
- interviews
- notifications
- billing
- audit_logs

---

# 13. Authentication

- Email
- Google
- Microsoft

Future
- LinkedIn

Security
- JWT
- Refresh Tokens
- RBAC
- Audit Logs

Handled by: Supabase Auth (built-in, free)

---

# 14. AI Architecture

Never depend on a single model.

Create an AI Provider Layer.

Supported providers may include:

- OpenAI
- Gemini
- Claude
- DeepSeek
- Qwen
- Llama
- Mistral

Use the best model per task.

Agent Framework: Mastra (TypeScript) for NestJS-side agents.
Python AI Workers: PraisonAI for document parsing and embedding pipelines.

---

# 15. Open Source Strategy

Prioritize open-source wherever practical.

Frontend
- Next.js
- Tailwind
- shadcn/ui
- Ant Design (AntD) — admin/ERP panels

Backend
- NestJS

AI Agents
- Mastra (TypeScript agent framework)
- PraisonAI (Python multi-agent framework)

Document Parsing
- Docling (IBM — advanced PDF/resume parsing)
- MarkItDown (Microsoft — fallback document converter)

Job Scraping / Automation
- Crawl4AI (async web crawler, stealth mode)
- Firecrawl (company career page scraping)
- browser-use (future auto-apply agent)

Queues
- BullMQ

Cache
- Redis

Database
- Supabase (PostgreSQL + pgvector + Auth + Storage)

Container
- Docker

Reverse Proxy
- Nginx

Monitoring
- Grafana
- Prometheus

Error Tracking
- Sentry

Analytics
- PostHog

---

# 16. AI Workflow

Resume Upload

↓

Resume Parsing (Docling)

↓

Skill Extraction (PraisonAI agent)

↓

Job Discovery (Crawl4AI workers)

↓

Semantic Matching (pgvector + Mastra agent)

↓

Resume Optimization (Mastra agent)

↓

Cover Letter (Mastra agent)

↓

Application Decision

↓

Application Tracking

↓

Interview Preparation (RAG on job + company data)

---

# 17. Automation Layer

Independent workers.

Examples

- LinkedIn Worker (Crawl4AI)
- Naukri Worker (Crawl4AI)
- Foundit Worker (Crawl4AI)
- Company Career Worker (Firecrawl)
- Auto-Apply Agent (browser-use — future)

Each worker must be isolated.
Each worker runs in its own Docker container.
Workers communicate via BullMQ queues.

---

# 18. Queue Architecture

Redis

BullMQ

Queues

- Resume Queue
- Parsing Queue
- Matching Queue
- AI Queue
- Notification Queue
- Application Queue

---

# 19. API Modules

/auth
/users
/profile
/resume
/jobs
/matches
/applications
/interviews
/notifications
/dashboard
/admin

---

# 20. Deployment

Frontend
- Vercel

Backend API
- Vercel (NestJS serverless) or Railway

Python AI Workers
- Docker (Railway or Fly.io)

Automation Workers
- Docker

Database
- Supabase (managed PostgreSQL)

Storage
- Supabase Storage

CI/CD
- GitHub Actions

---

# 21. Security

- Encryption at rest
- HTTPS
- Secret manager
- Rate limiting
- Audit logs
- Input validation
- RBAC

---

# 22. Development Roadmap

Sprint 1
- Authentication
- User Profile
- Resume Upload

Sprint 2
- Resume Parsing (Docling)
- Job Discovery (Crawl4AI workers)

Sprint 3
- Matching Engine (pgvector + Mastra)
- Dashboard

Sprint 4
- Notifications
- Resume Optimization Agent

Sprint 5
- Automation MVP
- Application Tracking

---

# 23. Success Metrics

- Active Users
- Daily Job Matches
- Applications Submitted
- Interview Rate
- Offer Rate
- Salary Improvement
- Customer Retention

---

# 24. Guiding Principle

We are **not building an auto-apply bot**.

We are building an **AI Career Operating System** that helps professionals maximize interview opportunities while keeping them informed and in control of their applications.

---

# 25. Open Source Stack Intelligence (from crazy-ai-stack)

This section documents the full analysis of the open source tools available and exactly how each maps to CareerOS AI.

## 25.1 Resume Parsing & Document Intelligence

| Tool | Source | What It Does | CareerOS Use |
|------|--------|-------------|--------------|
| Docling | IBM / crazy-ai-stack | Advanced PDF/DOCX parsing, table extraction, OCR, layout understanding, reading order detection | Primary resume parser. Handles complex multi-column resumes, scanned PDFs, tables |
| MarkItDown | Microsoft / crazy-ai-stack | Converts PDF/Word/Excel/images to clean Markdown for LLMs | Fallback for simpler files. Pre-processes documents before AI analysis |

Decision: Docling as primary. MarkItDown as fallback.
Both run as Python microservices, called from NestJS via internal HTTP.

## 25.2 Job Discovery & Web Scraping

| Tool | Source | What It Does | CareerOS Use |
|------|--------|-------------|--------------|
| Crawl4AI | crazy-ai-stack | Async web crawler, stealth mode, JS rendering, LLM extraction, infinite scroll, anti-bot bypass | Naukri / Foundit / LinkedIn job scraping workers. Handles pagination and dynamic content |
| Firecrawl | crazy-ai-stack | Clean web data API, batch scrape, structured JSON extraction, Node.js SDK | Company career page scraping. Fits NestJS backend natively |
| browser-use | crazy-ai-stack | LLM-controlled browser agent, form filling, navigation | Future auto-apply agent. Fills job application forms autonomously |
| Maxun | crazy-ai-stack | No-code web scraping with recorder mode + LLM extraction, schedule robots | Build Naukri/LinkedIn scrapers visually, schedule them, export as API |

Decision: Crawl4AI for bulk job scraping. Firecrawl for company career pages. browser-use for future auto-apply only.

## 25.3 AI Agent Framework

| Tool | Source | What It Does | CareerOS Use |
|------|--------|-------------|--------------|
| Mastra | crazy-ai-stack | TypeScript AI agent framework, 40+ LLM providers, workflows, human-in-loop, Vercel-deployable | Primary agent framework. Resume optimization, job matching, cover letter, interview prep agents. Fits NestJS/TypeScript stack perfectly |
| PraisonAI | crazy-ai-stack | Python multi-agent framework, 100+ LLMs, RAG, memory, MCP, planning mode | Python AI workers — resume parsing pipeline, skill extraction, embedding generation |

Decision: Mastra for TypeScript agents (NestJS side). PraisonAI for Python AI microservices.

## 25.4 Workflow Automation

| Tool | Source | What It Does | CareerOS Use |
|------|--------|-------------|--------------|
| n8n | crazy-ai-stack | Visual workflow automation, 400+ integrations, AI-native | Internal automation only — trigger resume parsing on upload, send notifications. NOT in product v1 |

## 25.5 Infrastructure & Database

| Tool | Source | What It Does | CareerOS Use |
|------|--------|-------------|--------------|
| Supabase | crazy-ai-stack | PostgreSQL + Auth + Storage + Realtime + pgvector | Entire database layer. Replaces separate PostgreSQL + pgvector + Auth setup. Free tier sufficient for Phase 1 |
| Composio | crazy-ai-stack | 500+ tool integrations for AI agents (LinkedIn, Gmail, etc.) | Connect agents to LinkedIn, Gmail, Naukri APIs without building custom integrations |

## 25.6 Tools NOT Used in Product (Internal Only or Irrelevant)

| Tool | Reason |
|------|--------|
| RAGFlow | Needs 16GB RAM, too heavy for Vercel/Supabase. Skip for v1 |
| HunyuanVideo / LTX-Video | Video generation — not relevant |
| Whisper | Audio transcription — not relevant for v1 |
| OpenHands | AI coding agent — internal dev tool only |
| MoneyPrinterTurbo | Content generation — not relevant |

---

# 26. UI/UX Design Strategy — ERP-Inspired Application Shell

## 26.1 The IDURAR Insight

After studying IDURAR ERP CRM (open source, from crazy-ai-stack), a key design decision has been made for CareerOS AI.

IDURAR is a production-grade ERP/CRM built with:
- React + Ant Design (AntD)
- Sidebar navigation with collapsible menu
- Layout: Sider + Header + Content (Ant Design Layout pattern)
- Module-based architecture: each feature is a self-contained module
- CRUD pattern: every entity has Create / Read / Update / Delete / Search / DataTable views
- ERP Panel: a reusable panel component that wraps DataTable + Delete + Context
- Layouts per section: ErpLayout, DashboardLayout, AuthLayout, SettingsLayout, ProfileLayout

## 26.2 Why ERP-Style UI for CareerOS AI

CareerOS AI is NOT a simple landing page product. It is an operating system for a professional's career. Every action a user takes — uploading a resume, tracking an application, reviewing a job match, preparing for an interview — is a structured workflow.

ERP-style UI gives us:

- Sidebar navigation — user always knows where they are
- Module isolation — each engine (Resume, Jobs, Applications, Interviews) is its own module
- DataTable views — job matches, applications, interview history are all list-based with filters
- Panel/Drawer pattern — view details without leaving the current page
- Action-driven design — every row has actions (Apply, Optimize, Track, Prepare)
- Status tracking — every application, resume version, job match has a visible status
- Settings module — subscription, profile, preferences, notifications all in one place
- Admin panel — separate admin shell for founder to manage users, billing, analytics

This is exactly how professionals think about their job search — as a pipeline, a process, a system to manage.

## 26.3 CareerOS AI Module Map (ERP-Style)

Each module below maps to one Core Engine from Section 8.

```
CareerOS AI Shell
│
├── Dashboard (Overview — metrics, activity feed, quick actions)
│
├── My Profile (Identity Engine + Career Profile Engine)
│   ├── Personal Info
│   ├── Work Experience
│   ├── Skills
│   ├── Education
│   └── Career Goals
│
├── Resume (Resume Intelligence Engine)
│   ├── Upload Resume
│   ├── Resume Versions (DataTable)
│   ├── AI Analysis (score, gaps, suggestions)
│   └── Optimized Versions
│
├── Jobs (Job Discovery Engine + Job Matching Engine)
│   ├── Matched Jobs (DataTable with filters)
│   ├── Saved Jobs
│   ├── Job Detail (Panel/Drawer)
│   └── Search & Filters
│
├── Applications (Application Engine)
│   ├── All Applications (DataTable — Kanban optional)
│   ├── Application Detail
│   ├── Status Tracking (Applied / Shortlisted / Interview / Offer / Rejected)
│   └── Timeline View
│
├── AI Tools (Resume Optimization + Cover Letter Engine)
│   ├── Resume Optimizer (job-specific tailoring)
│   ├── Cover Letter Generator
│   └── AI Suggestions
│
├── Interviews (Interview Engine)
│   ├── Upcoming Interviews
│   ├── Interview Prep (company research, question bank)
│   └── Interview History
│
├── Notifications (Notification Engine)
│   ├── All Notifications
│   └── Preferences
│
├── Analytics (Analytics Engine)
│   ├── Application Funnel
│   ├── Response Rate
│   ├── Salary Benchmarks
│   └── Career Progress
│
├── Billing (Billing Engine)
│   ├── Current Plan
│   ├── Usage
│   └── Invoices
│
└── Settings
    ├── Account
    ├── Preferences
    ├── Integrations
    └── Security
```

## 26.4 Admin Shell (Separate from User Shell)

```
Admin Panel
│
├── Dashboard (total users, revenue, active subscriptions)
├── Users (DataTable — search, filter, view, manage)
├── Subscriptions (billing overview)
├── Jobs Database (all scraped jobs)
├── Resume Queue (parsing status)
├── AI Queue (agent job status)
├── Automation Workers (scraper health)
├── Notifications (broadcast)
├── Settings (system config)
└── Audit Logs
```

## 26.5 UI Component Decisions

Inspired by IDURAR's pattern but built with our chosen stack:

| Pattern | IDURAR (Reference) | CareerOS AI (Implementation) |
|---------|-------------------|------------------------------|
| Layout shell | Ant Design Layout (Sider + Header + Content) | Next.js + Tailwind + shadcn/ui (same pattern) |
| Navigation | Ant Design Menu in Sider | shadcn/ui Sidebar component |
| Data tables | Ant Design Table | TanStack Table + shadcn/ui |
| Forms | Ant Design Form | React Hook Form + Zod + shadcn/ui |
| Modals/Drawers | Ant Design Modal/Drawer | shadcn/ui Dialog/Sheet |
| Status tags | Ant Design Tag | shadcn/ui Badge |
| Notifications | Ant Design notification | shadcn/ui Toast (Sonner) |
| Charts | Recharts (same) | Recharts |
| Page loader | Custom spinner | shadcn/ui Skeleton |

Key principle from IDURAR: Every module follows the same CRUD pattern.
In CareerOS AI: Every engine follows the same List → Detail → Action pattern.

## 26.6 Layout Architecture

```
AppShell
├── Sidebar (collapsible, module navigation)
├── Header (user avatar, notifications, search, plan badge)
└── Content Area
    ├── Page Header (title, breadcrumb, primary action button)
    ├── Filters / Search Bar
    ├── DataTable or Card Grid
    └── Side Panel / Drawer (detail view without page change)
```

This layout never changes. Only the Content Area changes per module.
This is the ERP principle — consistent shell, modular content.

## 26.7 UX Principles for CareerOS AI

1. Every action is one click away — no buried menus
2. Status is always visible — user never wonders "what happened to my application?"
3. AI suggestions are inline — not in a separate AI tab, but next to the relevant data
4. Progress is visible — dashboard shows career health score, application funnel, match rate
5. Control stays with the user — AI suggests, user decides, system tracks
6. Mobile-responsive — sidebar collapses to bottom nav on mobile
7. Empty states are helpful — when no jobs matched, show why and what to do next
8. Loading states are smooth — skeleton loaders, not spinners

---

# 27. Final Recommended Tech Stack (Locked)

## Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (primary component library)
- TanStack Query (server state)
- TanStack Table (data tables)
- React Hook Form + Zod (forms)
- Zustand (client state)
- Recharts (analytics)

## Backend
- NestJS (TypeScript)
- Deployed on Vercel (serverless) or Railway

## Database
- Supabase (PostgreSQL + pgvector + Auth + Storage + Realtime)

## AI Agents (TypeScript)
- Mastra — Resume Optimization, Job Matching, Cover Letter, Interview Prep agents

## AI Workers (Python)
- PraisonAI — Resume parsing pipeline, skill extraction, embedding generation
- Docling — PDF/DOCX resume parsing
- MarkItDown — Fallback document conversion

## Job Scraping Workers
- Crawl4AI — Naukri, Foundit, LinkedIn job scraping
- Firecrawl — Company career page scraping
- browser-use — Future auto-apply agent

## Queues
- BullMQ + Redis

## Deployment
- Vercel (frontend + NestJS API)
- Supabase (database)
- Railway or Fly.io (Python workers + Docker)
- GitHub Actions (CI/CD)

## Monitoring
- Sentry (errors)
- PostHog (analytics)

---

# 28. What We Are Building — One Line

A professional's career command center — where every job, every application, every resume version, every interview is tracked, optimized, and acted upon from a single ERP-style operating system powered by AI.
