import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(appRoot, "..", "..", "..");
const nextDir = join(appRoot, ".next");
const pkgPath = join(nextDir, "package.json");

if (!existsSync(nextDir)) {
  process.exit(0);
}

if (!existsSync(pkgPath)) {
  writeFileSync(
    pkgPath,
    JSON.stringify({ name: "web", type: "commonjs" }),
    "utf8",
  );
}

if (process.env.VERCEL !== "1") {
  process.exit(0);
}

const misplacedNext = join(repoRoot, "apps", "web", ".next");
mkdirSync(join(misplacedNext, ".."), { recursive: true });
cpSync(nextDir, misplacedNext, { recursive: true });

const appModules = join(appRoot, "node_modules");
const rootModules = join(repoRoot, "node_modules");
if (existsSync(appModules)) {
  mkdirSync(rootModules, { recursive: true });
  cpSync(appModules, rootModules, { recursive: true });
}
