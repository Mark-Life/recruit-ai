/**
 * Mock data for UI development.
 * Will be replaced with real API calls via TanStack Query.
 */

export type JobStatus = "draft" | "refining" | "matching" | "ready";
export type TalentStatus = "uploaded" | "extracting" | "reviewing" | "matched";

export interface MockJobDescription {
  createdAt: string;
  employmentType: "full-time" | "contract" | "freelance";
  experienceYearsMax: number;
  experienceYearsMin: number;
  id: string;
  keywords: readonly string[];
  location: string;
  matchCount: number;
  organizationId: string;
  organizationName: string;
  rawText: string;
  roleTitle: string;
  seniority: "junior" | "mid" | "senior" | "lead" | "principal";
  skills: readonly string[];
  status: JobStatus;
  summary: string;
  willingToSponsorRelocation: boolean;
  workMode: "office" | "hybrid" | "remote";
}

export interface MockTalent {
  createdAt: string;
  experienceYears: number;
  id: string;
  keywords: readonly string[];
  location: string;
  matchCount: number;
  name: string;
  rawResumeText: string;
  recruiterId: string;
  skills: readonly string[];
  status: TalentStatus;
  summary: string;
  title: string;
  willingToRelocate: boolean;
  workModes: readonly string[];
}

export interface MockRecruiter {
  email: string;
  id: string;
  name: string;
}

export interface MockScoreBreakdown {
  constraintFit: number;
  experienceFit: number;
  keywordOverlap: number;
  semanticSimilarity: number;
}

export interface MockMatch {
  breakdown: MockScoreBreakdown;
  id: string;
  jobDescriptionId: string;
  recruiter: MockRecruiter;
  recruiterId: string;
  talent: MockTalent;
  talentId: string;
  totalScore: number;
}

export interface MockClarifyingQuestion {
  field: string;
  options: readonly string[];
  question: string;
  reason: string;
}

// --- Recruiters ---

export const MOCK_RECRUITERS: readonly MockRecruiter[] = [
  {
    id: "rec-1",
    name: "Maria Santos",
    email: "maria.santos@talentbridge.io",
  },
  { id: "rec-2", name: "James Park", email: "james.park@techrecruit.com" },
  { id: "rec-3", name: "Aisha Khan", email: "aisha@hiringlab.co" },
];

// --- Talents ---

export const MOCK_TALENTS: readonly MockTalent[] = [
  {
    id: "tal-1",
    name: "Alex Chen",
    title: "Senior Frontend Developer",
    skills: ["React", "TypeScript", "Next.js", "GraphQL", "Tailwind CSS"],
    keywords: ["frontend", "SPA", "performance", "design systems"],
    experienceYears: 7,
    location: "Berlin, Germany",
    workModes: ["remote", "hybrid"],
    willingToRelocate: true,
    recruiterId: "rec-1",
    status: "matched",
    matchCount: 2,
    createdAt: "2026-03-24T08:00:00Z",
    rawResumeText:
      "Senior Frontend Developer with 7 years of experience building high-performance web applications. Expertise in React, TypeScript, and Next.js. Led the migration of a legacy jQuery application to a modern React SPA serving 500k monthly users. Built a shared design system used across 4 product teams. Experienced with GraphQL APIs, Tailwind CSS, and performance optimization. Previously at Zalando and N26.",
    summary:
      "Seasoned frontend specialist with strong React/TypeScript depth, design systems experience, and a track record at scale-up companies in Europe.",
  },
  {
    id: "tal-2",
    name: "Jordan Lee",
    title: "Frontend Engineer",
    skills: ["React", "JavaScript", "Vue.js", "CSS", "Webpack"],
    keywords: ["frontend", "UI", "responsive", "animations"],
    experienceYears: 4,
    location: "London, UK",
    workModes: ["hybrid", "office"],
    willingToRelocate: false,
    recruiterId: "rec-2",
    status: "reviewing",
    matchCount: 0,
    createdAt: "2026-03-26T11:00:00Z",
    rawResumeText:
      "Frontend Engineer with 4 years building responsive, accessible web interfaces. Proficient in React and Vue.js with a strong eye for animation and micro-interactions. Experience with Webpack bundling, CSS-in-JS, and responsive design. Built the customer-facing dashboard for a fintech startup handling £2M in monthly transactions. Passionate about UI polish and motion design.",
    summary:
      "Mid-level frontend engineer with dual React/Vue experience, strong CSS and animation skills, and fintech domain exposure.",
  },
  {
    id: "tal-3",
    name: "Sam Nakamura",
    title: "Fullstack Developer",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "Docker"],
    keywords: ["fullstack", "API", "database", "devops"],
    experienceYears: 6,
    location: "Tokyo, Japan",
    workModes: ["remote"],
    willingToRelocate: false,
    recruiterId: "rec-1",
    status: "extracting",
    matchCount: 0,
    createdAt: "2026-03-27T06:30:00Z",
    rawResumeText:
      "Fullstack Developer with 6 years spanning React frontends and Node.js backends. Strong PostgreSQL experience including schema design, query optimization, and migrations. Comfortable with Docker, CI/CD pipelines, and AWS infrastructure. Built microservices architecture for a SaaS product with 10k+ enterprise users. Open-source contributor to several Node.js libraries.",
    summary: "",
  },
  {
    id: "tal-4",
    name: "Priya Sharma",
    title: "Staff Frontend Engineer",
    skills: ["React", "TypeScript", "Next.js", "Remix", "Testing"],
    keywords: ["frontend", "architecture", "mentoring", "performance"],
    experienceYears: 10,
    location: "Bangalore, India",
    workModes: ["remote", "hybrid"],
    willingToRelocate: true,
    recruiterId: "rec-3",
    status: "matched",
    matchCount: 1,
    createdAt: "2026-03-23T14:00:00Z",
    rawResumeText:
      "Staff Frontend Engineer with 10 years of experience leading frontend architecture decisions across multiple product lines. Deep expertise in React, TypeScript, Next.js, and Remix. Champion of testing culture — introduced comprehensive E2E and component testing strategies that reduced production incidents by 60%. Mentored 12+ engineers across two organizations. Speaker at ReactConf India.",
    summary:
      "Staff-level frontend leader with deep framework expertise, testing advocacy, and a strong mentoring track record.",
  },
  {
    id: "tal-5",
    name: "Marcus Weber",
    title: "React Developer",
    skills: ["React", "TypeScript", "Redux", "Jest", "Storybook"],
    keywords: ["frontend", "testing", "component library"],
    experienceYears: 3,
    location: "Munich, Germany",
    workModes: ["office", "hybrid"],
    willingToRelocate: true,
    recruiterId: "rec-2",
    status: "uploaded",
    matchCount: 0,
    createdAt: "2026-03-27T09:00:00Z",
    rawResumeText:
      "React Developer with 3 years of experience focused on component-driven development. Built and maintained a Storybook-based component library used by 3 product teams. Strong testing background with Jest and React Testing Library. Experience with Redux state management and CI integration. Computer Science degree from TU Munich.",
    summary: "",
  },
];

// --- Job Descriptions ---

export const MOCK_JOBS: readonly MockJobDescription[] = [
  {
    id: "jd-1",
    organizationId: "org-1",
    organizationName: "Acme Corp",
    rawText:
      "We are looking for a Senior Frontend Engineer with 5+ years of experience in React and TypeScript. The ideal candidate has experience building complex SPAs, design systems, and working with GraphQL APIs. Remote-friendly, based in Europe.",
    roleTitle: "Senior Frontend Engineer",
    summary:
      "Senior Frontend Engineer role focused on React/TypeScript SPAs and design systems for a European remote team.",
    skills: ["React", "TypeScript", "GraphQL", "Design Systems"],
    keywords: ["frontend", "SPA", "remote", "Europe"],
    seniority: "senior",
    employmentType: "full-time",
    workMode: "remote",
    location: "Europe",
    willingToSponsorRelocation: false,
    experienceYearsMin: 5,
    experienceYearsMax: 10,
    status: "ready",
    matchCount: 4,
    createdAt: "2026-03-25T10:00:00Z",
  },
  {
    id: "jd-2",
    organizationId: "org-2",
    organizationName: "StartupXYZ",
    rawText:
      "Hiring a fullstack developer to join our small team. We use React on the frontend and Node.js on the backend. Must be comfortable with PostgreSQL and deploying to AWS. Contract position, 6 months.",
    roleTitle: "Fullstack Developer",
    summary:
      "Contract fullstack role with React/Node.js stack and AWS deployment.",
    skills: ["React", "Node.js", "PostgreSQL", "AWS"],
    keywords: ["fullstack", "startup", "contract"],
    seniority: "mid",
    employmentType: "contract",
    workMode: "hybrid",
    location: "Berlin, Germany",
    willingToSponsorRelocation: false,
    experienceYearsMin: 3,
    experienceYearsMax: 7,
    status: "refining",
    matchCount: 0,
    createdAt: "2026-03-26T14:30:00Z",
  },
  {
    id: "jd-3",
    organizationId: "org-1",
    organizationName: "Acme Corp",
    rawText:
      "We need a junior React developer to help maintain our internal tools. Good opportunity for someone early in their career. Office-based in Munich.",
    roleTitle: "Junior React Developer",
    summary: "Junior React position for internal tools maintenance in Munich.",
    skills: ["React", "JavaScript", "HTML", "CSS"],
    keywords: ["junior", "internal tools", "maintenance"],
    seniority: "junior",
    employmentType: "full-time",
    workMode: "office",
    location: "Munich, Germany",
    willingToSponsorRelocation: true,
    experienceYearsMin: 0,
    experienceYearsMax: 2,
    status: "matching",
    matchCount: 0,
    createdAt: "2026-03-27T09:15:00Z",
  },
];

// --- Matches (for jd-1) ---

function findRecruiter(id: string): MockRecruiter {
  const r = MOCK_RECRUITERS.find((rec) => rec.id === id);
  if (!r) {
    throw new Error(`Recruiter ${id} not found`);
  }
  return r;
}

function findTalent(id: string): MockTalent {
  const t = MOCK_TALENTS.find((tal) => tal.id === id);
  if (!t) {
    throw new Error(`Talent ${id} not found`);
  }
  return t;
}

export const MOCK_MATCHES_JD1: readonly MockMatch[] = [
  {
    id: "match-1",
    jobDescriptionId: "jd-1",
    talentId: "tal-1",
    recruiterId: "rec-1",
    totalScore: 0.92,
    breakdown: {
      semanticSimilarity: 0.94,
      keywordOverlap: 0.88,
      experienceFit: 0.95,
      constraintFit: 1.0,
    },
    talent: findTalent("tal-1"),
    recruiter: findRecruiter("rec-1"),
  },
  {
    id: "match-2",
    jobDescriptionId: "jd-1",
    talentId: "tal-4",
    recruiterId: "rec-3",
    totalScore: 0.87,
    breakdown: {
      semanticSimilarity: 0.91,
      keywordOverlap: 0.82,
      experienceFit: 0.85,
      constraintFit: 1.0,
    },
    talent: findTalent("tal-4"),
    recruiter: findRecruiter("rec-3"),
  },
  {
    id: "match-3",
    jobDescriptionId: "jd-1",
    talentId: "tal-3",
    recruiterId: "rec-1",
    totalScore: 0.73,
    breakdown: {
      semanticSimilarity: 0.78,
      keywordOverlap: 0.65,
      experienceFit: 0.8,
      constraintFit: 0.7,
    },
    talent: findTalent("tal-3"),
    recruiter: findRecruiter("rec-1"),
  },
  {
    id: "match-4",
    jobDescriptionId: "jd-1",
    talentId: "tal-2",
    recruiterId: "rec-2",
    totalScore: 0.61,
    breakdown: {
      semanticSimilarity: 0.72,
      keywordOverlap: 0.6,
      experienceFit: 0.55,
      constraintFit: 0.5,
    },
    talent: findTalent("tal-2"),
    recruiter: findRecruiter("rec-2"),
  },
];

// --- Clarifying Questions (for jd-2, the "refining" one) ---

export const MOCK_CLARIFYING_QUESTIONS: readonly MockClarifyingQuestion[] = [
  {
    field: "workMode",
    question: "What is the preferred work arrangement?",
    reason:
      "The JD mentions a small team but doesn't specify if remote work is possible.",
    options: ["Office", "Hybrid", "Remote"],
  },
  {
    field: "location",
    question: "Where is the team based?",
    reason: "Needed to filter candidates by geography and timezone overlap.",
    options: [],
  },
  {
    field: "seniority",
    question:
      "What seniority level are you targeting? The JD mentions comfort with the stack but not experience expectations.",
    reason: "Helps filter candidates by experience band.",
    options: ["Junior", "Mid", "Senior"],
  },
  {
    field: "willingToSponsorRelocation",
    question: "Would you sponsor relocation for the right candidate?",
    reason: "Opens the candidate pool beyond the local market.",
    options: ["Yes", "No"],
  },
];

// --- Reverse Matches (talent → jobs) ---

export interface MockTalentJobMatch {
  breakdown: MockScoreBreakdown;
  id: string;
  job: MockJobDescription;
  jobDescriptionId: string;
  talentId: string;
  totalScore: number;
}

function findJob(id: string): MockJobDescription {
  const j = MOCK_JOBS.find((job) => job.id === id);
  if (!j) {
    throw new Error(`Job ${id} not found`);
  }
  return j;
}

export const MOCK_TALENT_MATCHES_TAL1: readonly MockTalentJobMatch[] = [
  {
    id: "tmatch-1",
    talentId: "tal-1",
    jobDescriptionId: "jd-1",
    totalScore: 0.92,
    breakdown: {
      semanticSimilarity: 0.94,
      keywordOverlap: 0.88,
      experienceFit: 0.95,
      constraintFit: 1.0,
    },
    job: findJob("jd-1"),
  },
  {
    id: "tmatch-2",
    talentId: "tal-1",
    jobDescriptionId: "jd-2",
    totalScore: 0.68,
    breakdown: {
      semanticSimilarity: 0.72,
      keywordOverlap: 0.6,
      experienceFit: 0.7,
      constraintFit: 0.65,
    },
    job: findJob("jd-2"),
  },
];

export const MOCK_TALENT_MATCHES_TAL4: readonly MockTalentJobMatch[] = [
  {
    id: "tmatch-3",
    talentId: "tal-4",
    jobDescriptionId: "jd-1",
    totalScore: 0.87,
    breakdown: {
      semanticSimilarity: 0.91,
      keywordOverlap: 0.82,
      experienceFit: 0.85,
      constraintFit: 1.0,
    },
    job: findJob("jd-1"),
  },
];

// --- Helpers ---

export function getJobById(id: string): MockJobDescription | undefined {
  return MOCK_JOBS.find((j) => j.id === id);
}

export function getTalentById(id: string): MockTalent | undefined {
  return MOCK_TALENTS.find((t) => t.id === id);
}

export function getMatchesForJob(jobId: string): readonly MockMatch[] {
  if (jobId === "jd-1") {
    return MOCK_MATCHES_JD1;
  }
  return [];
}

export function getQuestionsForJob(
  jobId: string
): readonly MockClarifyingQuestion[] {
  if (jobId === "jd-2") {
    return MOCK_CLARIFYING_QUESTIONS;
  }
  return [];
}

export function getJobMatchesForTalent(
  talentId: string
): readonly MockTalentJobMatch[] {
  if (talentId === "tal-1") {
    return MOCK_TALENT_MATCHES_TAL1;
  }
  if (talentId === "tal-4") {
    return MOCK_TALENT_MATCHES_TAL4;
  }
  return [];
}
