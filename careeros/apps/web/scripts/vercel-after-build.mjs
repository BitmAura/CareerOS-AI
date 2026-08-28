import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
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

// Project Output Directory is repo-relative apps/web/.next (skips careeros/).
const misplaced = join(appRoot, "..", "..", "..", "apps", "web", ".next");
mkdirSync(join(misplaced, ".."), { recursive: true });
cpSync(nextDir, misplaced, { recursive: true });
