export type OpportunityKind = "Internship" | "Graduate / apprentice" | "Job";

export interface LiveOpportunity {
  id: string;
  company: string;
  role: string;
  location: string;
  kind: OpportunityKind;
  updatedAt?: string;
  applyUrl: string;
  sourceLabel: string;
  sourceUrl: string;
  tags: string[];
}

export interface OpportunitySourceStatus {
  company: string;
  status: "live" | "unavailable";
  count: number;
}

export interface OpportunityFeedResponse {
  opportunities: LiveOpportunity[];
  fetchedAt: string;
  stale: boolean;
  sources: OpportunitySourceStatus[];
  notice: string;
}

export interface GreenhouseSource {
  boardToken: string;
  company: string;
  sourceLabel: string;
  officialDomains: string[];
}

export const greenhouseSources: GreenhouseSource[] = [
  {
    boardToken: "formlabsinternships",
    company: "Formlabs",
    sourceLabel: "Formlabs Internship Board",
    officialDomains: ["formlabs.com"],
  },
  {
    boardToken: "spacex",
    company: "SpaceX",
    sourceLabel: "SpaceX Careers",
    officialDomains: ["spacex.com"],
  },
  {
    boardToken: "andurilindustries",
    company: "Anduril Industries",
    sourceLabel: "Anduril Careers",
    officialDomains: ["anduril.com"],
  },
  {
    boardToken: "verkada",
    company: "Verkada",
    sourceLabel: "Verkada Careers",
    officialDomains: ["verkada.com"],
  },
  {
    boardToken: "cloudflare",
    company: "Cloudflare",
    sourceLabel: "Cloudflare Careers",
    officialDomains: ["cloudflare.com"],
  },
];

export const officialCareerPortals = [
  {
    company: "Qualcomm India",
    focus: "India internships and early-career roles",
    url: "https://www.qualcomm.com/company/careers/internships-and-early-in-career-opportunities/india",
  },
  {
    company: "NVIDIA",
    focus: "Hardware, systems, software and AI roles",
    url: "https://jobs.nvidia.com/careers",
  },
  {
    company: "Intel",
    focus: "Semiconductor, validation and software roles",
    url: "https://jobs.intel.com/en",
  },
  {
    company: "Texas Instruments",
    focus: "Analog, embedded and semiconductor roles",
    url: "https://careers.ti.com/",
  },
  {
    company: "Siemens",
    focus: "Automation, electronics and software roles",
    url: "https://jobs.siemens.com/careers",
  },
  {
    company: "Bosch India",
    focus: "Electronics, automotive and IoT roles",
    url: "https://www.bosch.in/careers/job-offers/",
  },
] as const;

export interface GreenhouseJob {
  id: number;
  title: string;
  updated_at?: string;
  absolute_url: string;
  location?: { name: string };
}

const earlyCareerPattern = /\b(intern(?:ship)?|student|graduate|new grad|early career|apprentice|trainee|co-op)\b/i;
const engineeringPattern = /\b(engineer(?:ing)?|developer|technician|architect|designer|scientist|specialist)\b/i;
const entcPattern = /\b(electrical|electronics|embedded|firmware|hardware|rf|radar|radio frequency|antenna|signal|telecom|wireless|network|semiconductor|asic|fpga|vlsi|verification|validation|robotics|controls?|automation|systems?|software|linux|iot)\b/i;

const tagPatterns: Array<[string, RegExp]> = [
  ["Embedded", /\bembedded|firmware|microcontroller\b/i],
  ["Hardware", /\bhardware|electrical|electronics|pcb\b/i],
  ["RF / Wireless", /\brf|radar|radio frequency|antenna|wireless|telecom\b/i],
  ["Semiconductor", /\bsemiconductor|asic|fpga|vlsi|silicon|verification\b/i],
  ["Networking", /\bnetwork|cloud|infrastructure\b/i],
  ["Software", /\bsoftware|developer|linux\b/i],
  ["Automation", /\bautomation|robotics|controls?\b/i],
];

export function classifyOpportunity(title: string): OpportunityKind {
  if (/\b(intern(?:ship)?|student|co-op)\b/i.test(title)) return "Internship";
  if (/\b(graduate|new grad|early career|apprentice|trainee)\b/i.test(title)) return "Graduate / apprentice";
  return "Job";
}

export function isRelevantEngineeringOpportunity(title: string) {
  return earlyCareerPattern.test(title) || (engineeringPattern.test(title) && entcPattern.test(title));
}

function cleanText(value: string, maximumLength: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function isAllowedApplyUrl(value: string, source: GreenhouseSource) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    const allowedDomains = ["greenhouse.io", ...source.officialDomains];
    return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function normaliseUpdatedAt(value?: string) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

export function mapGreenhouseJobs(source: GreenhouseSource, jobs: GreenhouseJob[], perSourceLimit = 18): LiveOpportunity[] {
  return jobs
    .filter((job) => isRelevantEngineeringOpportunity(job.title) && isAllowedApplyUrl(job.absolute_url, source))
    .map((job) => {
      const role = cleanText(job.title, 240);
      return {
        id: `greenhouse:${source.boardToken}:${job.id}`,
        company: source.company,
        role,
        location: cleanText(job.location?.name || "Location shown on employer page", 180),
        kind: classifyOpportunity(role),
        updatedAt: normaliseUpdatedAt(job.updated_at),
        applyUrl: job.absolute_url,
        sourceLabel: source.sourceLabel,
        sourceUrl: `https://job-boards.greenhouse.io/${source.boardToken}`,
        tags: tagPatterns.filter(([, pattern]) => pattern.test(role)).map(([tag]) => tag).slice(0, 3),
      } satisfies LiveOpportunity;
    })
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, perSourceLimit);
}

export function sortAndLimitOpportunities(opportunities: LiveOpportunity[], limit = 72) {
  return [...opportunities]
    .sort((a, b) => {
      const kindPriority = { Internship: 0, "Graduate / apprentice": 1, Job: 2 } as const;
      const kindDifference = kindPriority[a.kind] - kindPriority[b.kind];
      return kindDifference || (b.updatedAt || "").localeCompare(a.updatedAt || "");
    })
    .slice(0, limit);
}

export interface OpportunityMatchProfile {
  targetRoles: string[];
  targetCompanies: string[];
  existingSkills: string[];
}

const matchStopWords = new Set(["and", "the", "for", "with", "engineer", "engineering", "role", "developer"]);

function matchTokens(values: string[]) {
  return Array.from(new Set(values
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9+#./-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !matchStopWords.has(token))));
}

export function matchOpportunityTagsForProfile(opportunity: LiveOpportunity, profile: OpportunityMatchProfile) {
  const profileText = [...profile.targetRoles, ...profile.existingSkills].join(" ");
  const profileTags = new Set(tagPatterns.filter(([, pattern]) => pattern.test(profileText)).map(([tag]) => tag));
  return opportunity.tags.filter((tag) => profileTags.has(tag));
}

export function scoreOpportunityForProfile(opportunity: LiveOpportunity, profile: OpportunityMatchProfile) {
  const searchable = opportunity.role.toLowerCase();
  const roleAndSkillMatches = matchTokens([...profile.targetRoles, ...profile.existingSkills]).filter((token) => searchable.includes(token));
  const domainMatches = matchOpportunityTagsForProfile(opportunity, profile);
  const preferredCompany = profile.targetCompanies.some((company) => {
    const normalized = company.trim().toLowerCase();
    return normalized.length > 1 && opportunity.company.toLowerCase().includes(normalized);
  });
  const locationBoost = /\bindia\b|\bremote\b/i.test(opportunity.location) ? 3 : 0;
  const earlyCareerBoost = opportunity.kind === "Internship" ? 5 : opportunity.kind === "Graduate / apprentice" ? 4 : 0;
  const seniorityPenalty = /\b(senior|sr\.?|staff|principal|director|manager|lead|head)\b/i.test(opportunity.role) ? 20 : 0;
  return roleAndSkillMatches.length * 4 + domainMatches.length * 10 + (preferredCompany ? 12 : 0) + locationBoost + earlyCareerBoost - seniorityPenalty;
}

export function rankOpportunitiesForProfile(opportunities: LiveOpportunity[], profile: OpportunityMatchProfile) {
  return [...opportunities].sort((a, b) => {
    const scoreDifference = scoreOpportunityForProfile(b, profile) - scoreOpportunityForProfile(a, profile);
    return scoreDifference || (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}
