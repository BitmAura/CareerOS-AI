import { readdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";

if (!process.env.VERCEL && !process.cwd().includes("/vercel/")) {
  process.exit(0);
}

const repo = "/vercel/path0";
const careeros = join(repo, "careeros");

try {
  for (const name of readdirSync(careeros)) {
    try {
      symlinkSync(join(careeros, name), join(repo, name), "dir");
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code !== "EEXIST") {
        throw err;
      }
    }
  }
} catch {
  // Root Directory may already be the app folder
}

try {
  symlinkSync(join(process.cwd(), "node_modules"), join(repo, "node_modules"), "dir");
} catch (err) {
  if (err && typeof err === "object" && "code" in err && err.code !== "EEXIST") {
    throw err;
  }
}
