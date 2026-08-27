import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { ResumeService } from "./resume.service";
import { Resume } from "./entities/resume.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

const uploadDir = join(process.cwd(), "uploads", "resumes");
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

/** Minimal heuristic scorer that runs synchronously on upload (no LLM required). */
function quickScoreFromText(text: string): { score: number; skills: string[] } {
  const lower = text.toLowerCase();
  const LEXICON = [
    "procurement", "purchase", "sourcing", "sap mm", "sap", "erp",
    "supply chain", "logistics", "inventory", "vendor management", "negotiation",
    "otif", "lean", "tpm", "six sigma", "quality", "iso", "production", "maintenance",
    "cost reduction", "kaizen", "capex", "opex", "mrp", "bom", "forecasting",
  ];
  const hits = LEXICON.filter((k) => lower.includes(k));
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const hasMetrics = /\d+%|\d+\s*(lakh|lpa|crore|rs\.?)\b/i.test(text);
  const hasVerbs = /(led|managed|reduced|improved|negotiated|owned|delivered)/i.test(text);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  let score = 40;
  if (hasEmail) score += 5;
  if (hasMetrics) score += 15;
  if (hasVerbs) score += 10;
  if (hits.length >= 4) score += 15;
  if (wordCount >= 250 && wordCount <= 700) score += 10;
  return {
    score: Math.min(92, Math.max(35, score)),
    skills: hits.map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase())),
  };
}

@Controller("resume")
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get()
  findAll(@Req() req: { user: { userId: string } }) {
    return this.resumeService.findByUserId(req.user.userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.resumeService.findOne(id);
  }

  /** G2 Fix: return version history for a resume */
  @Get(":id/versions")
  findVersions(@Param("id") id: string) {
    return this.resumeService.findVersionsByResumeId(id);
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException("Only PDF or Word resumes are allowed") as any, false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @Req() req: { user: { userId: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    // G1 Fix: attempt to read text from uploaded file for quick scoring
    // TODO: replace with Docling async parse when Python worker is wired
    let rawText = "";
    try {
      if (file.mimetype !== "application/pdf") {
        // For DOCX/DOC, read raw bytes as text (partial — proper parsing via Docling worker)
        rawText = readFileSync(file.path, "utf-8").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ");
      }
    } catch {
      rawText = "";
    }
    const quick = quickScoreFromText(rawText);

    return this.resumeService.create({
      userId: req.user.userId,
      fileName: file.originalname,
      fileUrl: `/uploads/resumes/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: rawText.length > 100 ? "analyzed" : "uploaded",
      aiScore: quick.score,
      parsedData: JSON.stringify({
        status: rawText.length > 100 ? "quick-scored" : "pending-docling-parse",
        skills: quick.skills,
        note: rawText.length <= 100
          ? "PDF text extraction pending — use Paste text or the web analyzer for full ATS score."
          : undefined,
      }),
    });
  }

  @Post()
  create(
    @Req() req: { user: { userId: string } },
    @Body()
    resume: Partial<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    }>,
  ) {
    return this.resumeService.create({ ...resume, userId: req.user.userId });
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() changes: Partial<Resume>) {
    return this.resumeService.update(id, changes);
  }
}
