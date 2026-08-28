import type { NextConfig } from "next";
import path from "path";

const repoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // Keep turbopack scoped to this app so /api and App Router routes resolve
  serverExternalPackages: ["unpdf", "mammoth"],
  // Monorepo: next is hoisted under careeros/node_modules
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
