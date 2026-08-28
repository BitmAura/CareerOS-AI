import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { tinyfishEngineStatus, isTinyFishConfigured } from "@/lib/engines/tinyfish";
import { llmStatus } from "@/lib/ai/llm";
import { PRODUCT_STANCE } from "@/lib/product/stance";

/** Which engines are live — no secrets returned. */
export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const tinyfish = tinyfishEngineStatus();
  const llm = llmStatus();

  return NextResponse.json({
    stance: {
      assistedApplyOnly: PRODUCT_STANCE.assistedApplyOnly,
      fullWebScrape: PRODUCT_STANCE.fullWebScrape,
    },
    accuracy: {
      liveJobSearch: isTinyFishConfigured() ? "tinyfish_search+fetch" : "beachhead_seeds_only",
      resumeAi: llm.provider === "none" ? "heuristic_only" : llm.provider,
      whatYouNeedForFullAccuracy: [
        {
          key: "TINYFISH_API_KEY",
          why: "Live public careers Search + Fetch in Daily queue",
          have: isTinyFishConfigured(),
        },
        {
          key: "GEMINI_API_KEY or OPENAI_API_KEY",
          why: "Accurate resume improve / tailor packets",
          have: llm.provider !== "none",
        },
        {
          key: "JWT_SECRET",
          why: "Stable auth sessions",
          have: Boolean(process.env.JWT_SECRET?.trim()),
        },
        {
          key: "SUPABASE_* (optional)",
          why: "Prod multi-user DB instead of local JSON",
          have: Boolean(
            (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
              (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
          ),
        },
        {
          key: "RESUME_PARSE_URL (optional)",
          why: "Better PDF/DOCX text extract",
          have: Boolean(process.env.RESUME_PARSE_URL?.trim()),
        },
      ],
    },
    engines: [
      tinyfish,
      {
        id: "llm",
        name: "LLM router (Gemini / OpenAI-compat)",
        configured: llm.provider !== "none",
        provider: llm.provider,
        model: llm.model,
        notes: "Resume improve, tailor, section rewrite",
      },
      {
        id: "native_fetch",
        name: "Native HTML fetch",
        configured: true,
        notes: "Fallback when TinyFish Fetch errors",
      },
      {
        id: "resume_parse",
        name: "MarkItDown resume worker",
        configured: Boolean(process.env.RESUME_PARSE_URL?.trim()),
        notes: "Optional DOCX/PDF extract worker",
      },
    ],
    jobUrlExtract: {
      primary: isTinyFishConfigured() ? "tinyfish" : "native",
      digest: isTinyFishConfigured() ? "tinyfish_live_then_beachhead" : "beachhead_only",
      blocked: ["linkedin.com", "naukri.com", "indeed.com", "Easy Apply bots"],
    },
  });
}
