import type { VectorCandidate } from "../ports/vector-search-port";
import type { StructuredJd } from "./models/job-description";
import type { ScoreBreakdown } from "./models/match";
import type { Talent } from "./models/talent";

interface ScoredTalent {
  readonly breakdown: ScoreBreakdown;
  readonly talent: Talent;
  readonly totalScore: number;
}

/** Weight configuration for score components */
const WEIGHTS = {
  semanticSimilarity: 0.4,
  keywordOverlap: 0.25,
  experienceFit: 0.2,
  constraintFit: 0.15,
} as const;

/**
 * Pure scoring — no Effect services, fully testable.
 * Combines semantic similarity from vector search with keyword overlap,
 * experience alignment, and hard constraint checks.
 */
export const scoreTalents = (
  jd: StructuredJd,
  talents: readonly Talent[],
  candidates: readonly VectorCandidate[]
): readonly ScoredTalent[] => {
  const similarityMap = new Map(candidates.map((c) => [c.id, c.similarity]));

  const jdKeywords = new Set(jd.keywords.map((k) => k.toLowerCase()));

  return talents
    .map((talent) => {
      const semanticSimilarity = similarityMap.get(talent.id) ?? 0;

      const keywordOverlap = computeKeywordOverlap(talent.keywords, jdKeywords);

      const experienceFit = computeExperienceFit(
        talent.experienceYears,
        jd.experienceYearsMin,
        jd.experienceYearsMax
      );

      const constraintFit = computeConstraintFit(talent, jd);

      const breakdown: ScoreBreakdown = {
        semanticSimilarity,
        keywordOverlap,
        experienceFit,
        constraintFit,
      } as ScoreBreakdown;

      const totalScore =
        semanticSimilarity * WEIGHTS.semanticSimilarity +
        keywordOverlap * WEIGHTS.keywordOverlap +
        experienceFit * WEIGHTS.experienceFit +
        constraintFit * WEIGHTS.constraintFit;

      return { talent, breakdown, totalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
};

interface ScoredJob {
  readonly breakdown: ScoreBreakdown;
  readonly jd: StructuredJd;
  readonly totalScore: number;
}

/**
 * Mirror of scoreTalents — scores jobs against a single talent.
 * Uses the same 4-factor weighted scoring.
 */
export const scoreJobs = (
  talent: Talent,
  jds: readonly StructuredJd[],
  candidates: readonly VectorCandidate[]
): readonly ScoredJob[] => {
  const similarityMap = new Map(candidates.map((c) => [c.id, c.similarity]));
  const talentKeywords = new Set(talent.keywords.map((k) => k.toLowerCase()));

  return jds
    .map((jd) => {
      const semanticSimilarity = similarityMap.get(jd.id) ?? 0;

      const jdKeywords = new Set(jd.keywords.map((k) => k.toLowerCase()));
      const keywordOverlap = computeKeywordOverlapSets(
        talentKeywords,
        jdKeywords
      );

      const experienceFit = computeExperienceFit(
        talent.experienceYears,
        jd.experienceYearsMin,
        jd.experienceYearsMax
      );

      const constraintFit = computeConstraintFit(talent, jd);

      const breakdown: ScoreBreakdown = {
        semanticSimilarity,
        keywordOverlap,
        experienceFit,
        constraintFit,
      } as ScoreBreakdown;

      const totalScore =
        semanticSimilarity * WEIGHTS.semanticSimilarity +
        keywordOverlap * WEIGHTS.keywordOverlap +
        experienceFit * WEIGHTS.experienceFit +
        constraintFit * WEIGHTS.constraintFit;

      return { jd, breakdown, totalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
};

/** Shared overlap computation between two keyword sets (0-1) */
const computeKeywordOverlapSets = (
  setA: ReadonlySet<string>,
  setB: ReadonlySet<string>
): number => {
  if (setB.size === 0) {
    return 0;
  }
  let overlap = 0;
  for (const tag of setA) {
    if (setB.has(tag)) {
      overlap++;
    }
  }
  return overlap / setB.size;
};

/** Jaccard-style overlap between talent keywords and JD keywords (0-1) */
const computeKeywordOverlap = (
  talentKeywords: readonly string[],
  jdKeywords: ReadonlySet<string>
): number => {
  if (jdKeywords.size === 0) {
    return 0;
  }

  const talentTags = new Set(talentKeywords.map((t) => t.toLowerCase()));

  let overlap = 0;
  for (const tag of talentTags) {
    if (jdKeywords.has(tag)) {
      overlap++;
    }
  }

  return overlap / jdKeywords.size;
};

/** 1.0 if within range, degrades linearly outside (0–1) */
const computeExperienceFit = (
  years: number,
  min: number,
  max: number
): number => {
  if (years >= min && years <= max) {
    return 1;
  }

  const distance = years < min ? min - years : years - max;
  const range = max - min || 1;
  return Math.max(0, 1 - distance / range);
};

/** Hard + soft constraint check for location, work mode, relocation (0–1) */
const computeConstraintFit = (talent: Talent, jd: StructuredJd): number => {
  let score = 0;
  let checks = 0;

  // Work mode compatibility
  checks++;
  if (talent.workModes.includes(jd.workMode)) {
    score++;
  }

  // Location match (simple string match for now — city/country)
  checks++;
  const talentLoc = talent.location.toLowerCase();
  const jdLoc = jd.location.toLowerCase();
  if (
    jd.workMode === "remote" ||
    talentLoc.includes(jdLoc) ||
    jdLoc.includes(talentLoc)
  ) {
    score++;
  } else if (talent.willingToRelocate && jd.willingToSponsorRelocation) {
    const RELOCATION_PARTIAL_SCORE = 0.5;
    score += RELOCATION_PARTIAL_SCORE;
  }

  return checks > 0 ? score / checks : 1;
};
