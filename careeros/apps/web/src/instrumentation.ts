/**
 * Prefer IPv4 so TinyFish / CloudFront don't hang on broken IPv6.
 * Must not import node:dns at top level — that breaks Vercel Edge (opengraph-image).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // ignore
  }
}
