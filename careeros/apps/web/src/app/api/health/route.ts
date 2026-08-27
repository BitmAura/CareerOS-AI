import { NextResponse } from "next/server";
import { llmStatus } from "@/lib/ai/llm";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { PRODUCT_STANCE } from "@/lib/product/stance";

export async function GET() {
  const llm = llmStatus();
  return NextResponse.json({
    status: "ok",
    mode: isSupabaseConfigured() ? "supabase" : "local",
    models: {
      ...llm,
      openSourceLlmsUsed:
        llm.provider === "openai_compat" ? [llm.model] : [],
      note:
        "LLM router: OPENAI_BASE_URL (FreeLLMAPI/Ollama/OpenRouter) → else GEMINI → else heuristics. No LinkedIn Easy Apply bots.",
    },
    gemini: Boolean(process.env.GEMINI_API_KEY),
    product: {
      atsLabel: PRODUCT_STANCE.atsLabel,
      dailyDigestRunsMax: PRODUCT_STANCE.dailyDigestRunsMax,
      dailyQueueCap: PRODUCT_STANCE.dailyQueueCap,
      fullWebScrape: PRODUCT_STANCE.fullWebScrape,
    },
    timestamp: new Date().toISOString(),
  });
}
