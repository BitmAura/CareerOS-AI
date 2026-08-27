/**
 * Parse soft signals from job text / JSON-LD for ranking.
 * Unknown values stay undefined (neutral in rubric).
 */

export type JobSignals = {
  postedAt?: string;
  salary?: string;
  salaryLpaMin?: number;
  salaryLpaMax?: number;
  noticeDays?: number;
};

export function parseSalaryLpa(blob: string): {
  salary?: string;
  salaryLpaMin?: number;
  salaryLpaMax?: number;
} {
  const text = blob || "";
  const range = text.match(
    /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh)/i,
  );
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return {
      salary: `${Math.min(a, b)}-${Math.max(a, b)} LPA`,
      salaryLpaMin: Math.min(a, b),
      salaryLpaMax: Math.max(a, b),
    };
  }
  const single = text.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lakh)/i);
  if (single) {
    const v = Number(single[1]);
    return { salary: `${v} LPA`, salaryLpaMin: v, salaryLpaMax: v };
  }
  return {};
}

export function parseNoticeDays(blob: string): number | undefined {
  const text = blob || "";
  const days = text.match(
    /(?:notice|joining)\s*(?:period)?[^0-9]{0,20}(\d+)\s*days?/i,
  );
  if (days) return Number(days[1]);
  const immediate = /immediate\s+joiner|join\s+immediately|0\s*days?\s*notice/i.test(text);
  if (immediate) return 0;
  const months = text.match(/notice[^0-9]{0,20}(\d+)\s*months?/i);
  if (months) return Number(months[1]) * 30;
  return undefined;
}

export function parsePostedAt(raw: unknown): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export function freshnessDays(postedAt?: string | null, now = new Date()): number | undefined {
  if (!postedAt) return undefined;
  const d = new Date(postedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

export function extractJobSignals(opts: {
  description?: string;
  salary?: string;
  datePosted?: unknown;
  baseSalary?: unknown;
}): JobSignals {
  const blob = `${opts.salary || ""} ${opts.description || ""}`;
  const fromText = parseSalaryLpa(blob);
  let salaryLpaMin = fromText.salaryLpaMin;
  let salaryLpaMax = fromText.salaryLpaMax;
  let salary = fromText.salary || opts.salary;

  // JSON-LD baseSalary sometimes uses value / currency
  const bs = opts.baseSalary as
    | { value?: number | { value?: number; minValue?: number; maxValue?: number }; currency?: string }
    | undefined;
  if (bs?.value && typeof bs.value === "object") {
    const min = bs.value.minValue ?? bs.value.value;
    const max = bs.value.maxValue ?? bs.value.value;
    if (typeof min === "number" && min > 0 && min < 200) {
      salaryLpaMin = min;
      salaryLpaMax = typeof max === "number" ? max : min;
      salary = `${salaryLpaMin}-${salaryLpaMax} LPA`;
    }
  }

  return {
    postedAt: parsePostedAt(opts.datePosted),
    salary,
    salaryLpaMin,
    salaryLpaMax,
    noticeDays: parseNoticeDays(blob),
  };
}
