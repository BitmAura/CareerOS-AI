/**
 * One-shot TinyFish smoke test (no Next server required).
 * Usage: node scripts/test-tinyfish.mjs
 */
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dns.setDefaultResultOrder("ipv4first");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");
const env = fs.readFileSync(envPath, "utf8");
const key = env
  .split(/\r?\n/)
  .find((l) => l.startsWith("TINYFISH_API_KEY="))
  ?.slice("TINYFISH_API_KEY=".length)
  ?.trim();

if (!key) {
  console.error("FAIL: TINYFISH_API_KEY missing in apps/web/.env.local");
  process.exit(1);
}

console.log("key_prefix=", key.slice(0, 12) + "...");

const fetchRes = await fetch("https://api.fetch.tinyfish.ai", {
  method: "POST",
  headers: {
    "X-API-Key": key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    urls: ["https://www.tatasteel.com/careers/"],
    format: "markdown",
    ttl: 0,
    intent: "Extract public careers page for assisted apply",
  }),
  signal: AbortSignal.timeout(90_000),
});

const fetchJson = await fetchRes.json();
console.log("fetch_http=", fetchRes.status);
console.log("fetch_results=", fetchJson.results?.length ?? 0);
console.log("fetch_errors=", fetchJson.errors?.length ?? 0);
console.log("fetch_title=", fetchJson.results?.[0]?.title || null);
console.log("fetch_text_len=", String(fetchJson.results?.[0]?.text || "").length);

const searchUrl = new URL("https://api.search.tinyfish.ai");
searchUrl.searchParams.set("query", "Asian Paints careers procurement India");
searchUrl.searchParams.set("num_results", "3");
const searchRes = await fetch(searchUrl, {
  headers: { "X-API-Key": key },
  signal: AbortSignal.timeout(60_000),
});
const searchJson = await searchRes.json();
console.log("search_http=", searchRes.status);
console.log(
  "search_hits=",
  (searchJson.results || []).slice(0, 3).map((h) => `${h.title} -> ${h.url}`),
);

if (fetchRes.status !== 200 || !fetchJson.results?.length) {
  console.error("FAIL: Fetch");
  process.exit(1);
}
if (searchRes.status !== 200) {
  console.error("FAIL: Search");
  process.exit(1);
}
console.log("ENGINE_OK");
