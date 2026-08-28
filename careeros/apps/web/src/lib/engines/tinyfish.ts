/**
 * TinyFish engines — from the Agentic Orchestration stack (Luma hack sponsors).
 * Docs: https://docs.tinyfish.ai/
 *
 * Fetch = free page scrape (JS-rendered → clean markdown/html).
 * Search = free live web search for public career URLs.
 *
 * CareerOS still does NOT use these to bypass LinkedIn/Naukri login walls
 * or to silent Easy Apply (see PRODUCT_STANCE).
 * IPv4-first DNS is not set here — node:dns cannot ship on Vercel Edge.
 */

export type TinyFishFetchResult = {
  url: string;
  final_url?: string | null;
  title?: string | null;
  description?: string | null;
  text?: string | object | null;
  format?: string;
  elapsed_ms?: number | null;
  latency_ms?: number | null;
};

export type TinyFishFetchError = {
  url: string;
  error: string;
  status?: number;
};

export type TinyFishFetchResponse = {
  results: TinyFishFetchResult[];
  errors: TinyFishFetchError[];
};

export function isTinyFishConfigured(): boolean {
  return Boolean(process.env.TINYFISH_API_KEY?.trim());
}

export function tinyfishEngineStatus() {
  const configured = isTinyFishConfigured();
  return {
    id: "tinyfish",
    name: "TinyFish",
    configured,
    fetch: configured ? "ready" : "needs_TINYFISH_API_KEY",
    search: configured ? "ready" : "needs_TINYFISH_API_KEY",
    docs: "https://docs.tinyfish.ai/",
    notes:
      "Fetch/Search are free on TinyFish plans. Agent/Browser use credits — not wired for Easy Apply bots.",
  };
}

export async function tinyfishFetchUrls(
  urls: string[],
  opts?: {
    format?: "markdown" | "html" | "json";
    intent?: string;
    ttl?: number;
    timeoutMs?: number;
    includeSelectors?: string[];
  },
): Promise<TinyFishFetchResponse> {
  const key = process.env.TINYFISH_API_KEY?.trim();
  if (!key) {
    throw new Error("TINYFISH_API_KEY is not set");
  }
  if (!urls.length) {
    return { results: [], errors: [] };
  }
  if (urls.length > 10) {
    throw new Error("TinyFish Fetch accepts at most 10 URLs per request");
  }

  const body: Record<string, unknown> = {
    urls,
    format: opts?.format ?? "markdown",
    ttl: opts?.ttl ?? 0,
    per_url_timeout_ms: opts?.timeoutMs ?? 45_000,
  };
  if (opts?.intent?.trim()) body.intent = opts.intent.trim().slice(0, 2000);
  if (opts?.includeSelectors?.length) body.include_selectors = opts.includeSelectors;

  const res = await fetch("https://api.fetch.tinyfish.ai", {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(150_000),
  });

  if (res.status === 401) {
    throw new Error("TinyFish API key rejected (401) — check TINYFISH_API_KEY");
  }
  if (res.status === 429) {
    throw new Error("TinyFish rate limit hit — retry shortly");
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`TinyFish Fetch failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as TinyFishFetchResponse;
  return {
    results: data.results || [],
    errors: data.errors || [],
  };
}

/** Single-URL convenience — throws with the per-URL error if Fetch failed. */
export async function tinyfishFetchOne(
  url: string,
  opts?: Parameters<typeof tinyfishFetchUrls>[1],
): Promise<TinyFishFetchResult> {
  const { results, errors } = await tinyfishFetchUrls([url], opts);
  if (results[0]) return results[0];
  const err = errors[0];
  throw new Error(
    err
      ? `TinyFish could not fetch page (${err.error}${err.status ? ` ${err.status}` : ""})`
      : "TinyFish returned no content",
  );
}

export type TinyFishSearchHit = {
  title?: string;
  url?: string;
  snippet?: string;
  description?: string;
};

/**
 * TinyFish Search — live web results (not cached SERP dumps).
 * Use for finding public careers/ATS URLs; never as LinkedIn login bypass.
 */
export async function tinyfishSearch(
  query: string,
  opts?: { numResults?: number },
): Promise<TinyFishSearchHit[]> {
  const key = process.env.TINYFISH_API_KEY?.trim();
  if (!key) throw new Error("TINYFISH_API_KEY is not set");
  const q = query.trim();
  if (!q) return [];

  const num = Math.min(10, Math.max(1, opts?.numResults ?? 5));
  const url = new URL("https://api.search.tinyfish.ai");
  url.searchParams.set("query", q);
  url.searchParams.set("num_results", String(num));
  // Soft geo for India manufacturing careers discovery
  url.searchParams.set("location", "India");
  url.searchParams.set("purpose", "Find public company careers / ATS job posting pages (not LinkedIn login walls)");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-API-Key": key,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`TinyFish Search failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as
    | { results?: TinyFishSearchHit[] }
    | TinyFishSearchHit[];

  if (Array.isArray(data)) return data;
  return data.results || [];
}
