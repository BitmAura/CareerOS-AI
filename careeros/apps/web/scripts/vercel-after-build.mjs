import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
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

// Dashboard Output Directory is repo-relative apps/web/.next (missing careeros/).
const misplaced = join(appRoot, "..", "..", "..", "apps", "web", ".next");
mkdirSync(misplaced, { recursive: true });
copyFileSync(pkgPath, join(misplaced, "package.json"));
