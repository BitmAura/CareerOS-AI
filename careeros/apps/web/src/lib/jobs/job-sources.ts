/**
 * Candidate-facing source attribution for manufacturing jobs.
 *
 * Strategy:
 * 1) Official employer ATS/job-detail pages
 * 2) Official PSU recruitment notices
 * 3) Candidate-supplied portal JDs (never scraped)
 */

export type JobSourceType =
  | "company_ats"
  | "company_careers"
  | "psu_notice"
  | "user_supplied"
  | "unknown";

export type JobSourceAttribution = {
  platform: string;
  publisher?: string;
  label: string;
  type: JobSourceType;
  official: boolean;
};

type RegisteredSource = {
  host: string;
  publisher: string;
  platform: string;
  type: "company_ats" | "company_careers" | "psu_notice";
};

/**
 * Public sources verified from official/searchable pages.
 * This is attribution, not a claim that every listing on a root page is active.
 */
export const VERIFIED_MANUFACTURING_SOURCES: RegisteredSource[] = [
  { host: "jobs.siemens.com", publisher: "Siemens", platform: "Siemens Jobs", type: "company_ats" },
  { host: "careers.se.com", publisher: "Schneider Electric", platform: "Schneider Careers", type: "company_ats" },
  { host: "careers.abb", publisher: "ABB", platform: "ABB Careers", type: "company_ats" },
  { host: "jci.wd5.myworkdayjobs.com", publisher: "Johnson Controls", platform: "Workday", type: "company_ats" },
  { host: "kone.wd3.myworkdayjobs.com", publisher: "KONE", platform: "Workday", type: "company_ats" },
  { host: "shell.wd3.myworkdayjobs.com", publisher: "Shell", platform: "Workday", type: "company_ats" },
  { host: "flowserve.wd1.myworkdayjobs.com", publisher: "Flowserve", platform: "Workday", type: "company_ats" },
  { host: "philips.wd3.myworkdayjobs.com", publisher: "Philips", platform: "Workday", type: "company_ats" },
  { host: "bosch.in", publisher: "Bosch India", platform: "Bosch Careers", type: "company_careers" },
  { host: "tatasteelindia.com", publisher: "Tata Steel", platform: "Tata Steel Careers", type: "company_careers" },
  { host: "tatasteel.co.in", publisher: "Tata Steel", platform: "Tata Steel Recruitment", type: "company_careers" },
  { host: "careers.bhel.in", publisher: "BHEL", platform: "BHEL Recruitment", type: "psu_notice" },
  { host: "sailcareers.com", publisher: "SAIL", platform: "SAIL Careers", type: "psu_notice" },
  { host: "gailonline.com", publisher: "GAIL", platform: "GAIL Careers", type: "psu_notice" },
];

const ATS_HOSTS: Array<{ match: RegExp; platform: string }> = [
  { match: /myworkdayjobs\.com|workday\.com/i, platform: "Workday" },
  { match: /successfactors\./i, platform: "SAP SuccessFactors" },
  { match: /smartrecruiters\.com/i, platform: "SmartRecruiters" },
  { match: /greenhouse\.io/i, platform: "Greenhouse" },
  { match: /lever\.co/i, platform: "Lever" },
  { match: /ashbyhq\.com/i, platform: "Ashby" },
  { match: /icims\.com/i, platform: "iCIMS" },
  { match: /taleo\./i, platform: "Oracle Taleo" },
  { match: /ripplehire\.com/i, platform: "RippleHire" },
  { match: /zwayam\.com/i, platform: "Zwayam" },
  { match: /turbohire\./i, platform: "TurboHire" },
];

export function isKnownOfficialSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return VERIFIED_MANUFACTURING_SOURCES.some(
      (source) => host === source.host || host.endsWith(`.${source.host}`),
    );
  } catch {
    return false;
  }
}

export function attributeJobSource(
  url: string,
  publisherHint?: string | null,
): JobSourceAttribution {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return {
      platform: "Candidate supplied",
      publisher: publisherHint || undefined,
      label: publisherHint ? `Added from ${publisherHint}` : "Candidate-supplied JD",
      type: "user_supplied",
      official: false,
    };
  }

  const registered = VERIFIED_MANUFACTURING_SOURCES.find(
    (source) => host === source.host || host.endsWith(`.${source.host}`),
  );
  if (registered) {
    return {
      platform: registered.platform,
      publisher: publisherHint || registered.publisher,
      label: `Official ${registered.platform}`,
      type: registered.type,
      official: true,
    };
  }

  const ats = ATS_HOSTS.find((entry) => entry.match.test(host));
  if (ats) {
    const publisher = publisherHint?.trim() || undefined;
    return {
      platform: ats.platform,
      publisher,
      label: publisher ? `${publisher} via ${ats.platform}` : `Employer job via ${ats.platform}`,
      type: "company_ats",
      official: true,
    };
  }

  const publisher = publisherHint?.trim() || undefined;
  return {
    platform: host,
    publisher,
    label: publisher ? `${publisher} careers` : `Employer careers (${host})`,
    type: "company_careers",
    official: false,
  };
}

/** Search cohorts kept small so each TinyFish query remains useful. */
export function manufacturingSourceSearchClauses(
  family: string,
): string[] {
  const enterprise =
    "(site:jobs.siemens.com OR site:careers.se.com/jobs OR site:careers.abb)";
  const enterpriseAts =
    "(site:myworkdayjobs.com OR site:successfactors.com OR site:jobs.smartrecruiters.com)";
  const publicSector =
    "(site:careers.bhel.in OR site:sailcareers.com OR site:gailonline.com/careers)";

  if (family === "plant_ops" || family === "procurement") {
    return [enterprise, enterpriseAts, publicSector];
  }
  return [enterprise, enterpriseAts];
}
