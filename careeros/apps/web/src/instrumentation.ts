import dns from "node:dns";

/**
 * Prefer IPv4 so TinyFish / other CloudFront APIs don't hang on broken IPv6 paths.
 */
export async function register() {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // ignore
  }
}
