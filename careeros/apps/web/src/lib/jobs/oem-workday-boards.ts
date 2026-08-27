/**
 * Verified India-hiring industrial OEM Workday boards.
 * These POST /wday/cxs/{tenant}/{site}/jobs endpoints returned live India roles in probe.
 */

export type WorkdayOemBoard = {
  id: string;
  company: string;
  /** e.g. jci.wd5.myworkdayjobs.com */
  host: string;
  tenant: string;
  site: string;
  tags: string[];
};

export const INDIA_OEM_WORKDAY_BOARDS: WorkdayOemBoard[] = [
  {
    id: "wd-jci",
    company: "Johnson Controls",
    host: "jci.wd5.myworkdayjobs.com",
    tenant: "jci",
    site: "JCI",
    tags: ["sales", "ops", "manufacturing", "plant"],
  },
  {
    id: "wd-kone",
    company: "KONE",
    host: "kone.wd3.myworkdayjobs.com",
    tenant: "kone",
    site: "Careers",
    tags: ["sales", "ops", "plant", "manufacturing"],
  },
  {
    id: "wd-shell",
    company: "Shell",
    host: "shell.wd3.myworkdayjobs.com",
    tenant: "shell",
    site: "ShellCareers",
    tags: ["ops", "procurement", "supply", "plant"],
  },
  {
    id: "wd-flowserve",
    company: "Flowserve",
    host: "flowserve.wd1.myworkdayjobs.com",
    tenant: "flowserve",
    site: "applied",
    tags: ["manufacturing", "plant", "sales", "ops"],
  },
  {
    id: "wd-philips",
    company: "Philips",
    host: "philips.wd3.myworkdayjobs.com",
    tenant: "philips",
    site: "jobs-and-careers",
    tags: ["ops", "sales", "manufacturing"],
  },
];

export function oemBoardsForFamily(family: string): WorkdayOemBoard[] {
  const prefer =
    family === "sales"
      ? ["sales", "ops"]
      : family === "procurement"
        ? ["procurement", "supply", "ops"]
        : family === "plant_ops"
          ? ["plant", "manufacturing", "ops"]
          : ["manufacturing", "ops", "sales", "supply", "procurement"];

  return [...INDIA_OEM_WORKDAY_BOARDS].sort((a, b) => {
    const as = a.tags.some((t) => prefer.includes(t)) ? 0 : 1;
    const bs = b.tags.some((t) => prefer.includes(t)) ? 0 : 1;
    return as - bs;
  });
}

export function workdayJobsUrl(board: WorkdayOemBoard): string {
  return `https://${board.host}/wday/cxs/${board.tenant}/${board.site}/jobs`;
}

export function workdayJobDetailUrl(board: WorkdayOemBoard, externalPath: string): string {
  const path = externalPath.startsWith("/") ? externalPath : `/${externalPath}`;
  return `https://${board.host}/${board.site}${path}`;
}
