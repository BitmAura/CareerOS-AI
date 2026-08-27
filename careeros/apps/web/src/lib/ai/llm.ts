/**
 * Unified LLM text generation for CareerOS.
 * Priority (HireForge/JobPilot pattern — BYOK multi-provider):
 * 1) OpenAI-compatible (OpenAI / FreeLLMAPI / Ollama / OpenRouter / Groq)
 * 2) Google Gemini native
 * 3) null → caller uses heuristics
 */
export type LlmProvider = "openai_compat" | "gemini" | "none";

export function resolveLlmProvider(): LlmProvider {
  if (process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL) {
    // base URL alone with empty key is ok for local Ollama
    if (process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL?.includes("11434")) {
      return "openai_compat";
    }
  }
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "none";
}

export function llmStatus() {
  const provider = resolveLlmProvider();
  return {
    provider,
    openSourcePath:
      provider === "openai_compat" &&
      Boolean(
        process.env.OPENAI_BASE_URL?.includes("11434") ||
          process.env.OPENAI_BASE_URL?.toLowerCase().includes("freellm") ||
          process.env.LLM_OPEN_SOURCE === "1",
      ),
    model:
      provider === "openai_compat"
        ? process.env.OPENAI_MODEL || "gpt-4.1-mini"
        : provider === "gemini"
          ? process.env.GEMINI_MODEL || "gemini-2.0-flash"
          : "heuristic-rules-only",
  };
}

export async function llmGenerate(
  prompt: string,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string | null> {
  const provider = resolveLlmProvider();
  if (provider === "openai_compat") {
    const text = await openaiCompatGenerate(prompt, opts);
    if (text) return text;
    if (process.env.GEMINI_API_KEY) return geminiGenerate(prompt, opts);
    return null;
  }
  if (provider === "gemini") {
    return geminiGenerate(prompt, opts);
  }
  return null;
}

async function openaiCompatGenerate(
  prompt: string,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string | null> {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const key = process.env.OPENAI_API_KEY || "ollama";
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: opts?.temperature ?? 0.4,
        max_tokens: opts?.maxTokens ?? 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("openai_compat error", await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (e) {
    console.error("openai_compat failed", e);
    return null;
  }
}

async function geminiGenerate(
  prompt: string,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts?.temperature ?? 0.4,
          maxOutputTokens: opts?.maxTokens ?? 2048,
        },
      }),
    });
    if (!res.ok) {
      console.error("gemini error", await res.text());
      return null;
    }
    const data = await res.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ||
      "";
    return text.trim() || null;
  } catch (e) {
    console.error("gemini failed", e);
    return null;
  }
}
