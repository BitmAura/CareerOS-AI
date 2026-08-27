import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep turbopack scoped to this app so /api and App Router routes resolve
  serverExternalPackages: ["unpdf", "mammoth"],
  // Monorepo: next is hoisted under careeros/node_modules
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
