/**
 * India-hiring public ATS boards for CareerOS portal scan.
 * Manufacturing / industrial only — US SaaS marketplace boards removed from buy-bar.
 */

export type PortalBoardKind = "greenhouse" | "lever" | "ashby";

export type PortalBoard = {
  id: string;
  company: string;
  kind: PortalBoardKind;
  token: string;
  tags: string[];
  indiaHiring: boolean;
};

/** Boards that post India manufacturing / plant / supply roles. */
export const INDIA_MANUFACTURING_PORTAL_BOARDS: PortalBoard[] = [
  {
    id: "gh-fictiv",
    company: "Fictiv",
    kind: "greenhouse",
    token: "fictiv",
    tags: ["manufacturing", "plant", "supply", "ops"],
    indiaHiring: true,
  },
  {
    id: "gh-xometry",
    company: "Xometry",
    kind: "greenhouse",
    token: "xometry",
    tags: ["manufacturing", "supply", "ops", "sales"],
    indiaHiring: true,
  },
];

export function boardsForRoleFamily(family: string): PortalBoard[] {
  const prefer =
    family === "sales"
      ? ["sales", "ops"]
      : family === "procurement"
        ? ["supply", "ops", "manufacturing"]
        : family === "plant_ops"
          ? ["manufacturing", "plant", "ops"]
          : ["manufacturing", "ops", "sales", "supply"];

  return [...INDIA_MANUFACTURING_PORTAL_BOARDS]
    .filter((b) => b.indiaHiring)
    .sort((a, b) => {
      const as = a.tags.some((t) => prefer.includes(t)) ? 0 : 1;
      const bs = b.tags.some((t) => prefer.includes(t)) ? 0 : 1;
      return as - bs;
    });
}
