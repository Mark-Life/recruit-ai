import type { VectorCandidate } from "../ports/vector-search-port";
import type { JobDescriptionId, TalentId } from "./models/ids";
import type { StructuredJd } from "./models/job-description";
import { ScoreBreakdown } from "./models/match";
import type { Talent } from "./models/talent";

export interface ScoredPair {
  readonly breakdown: ScoreBreakdown;
  readonly jobId: JobDescriptionId;
  readonly talentId: TalentId;
  readonly totalScore: number;
}

/** Weight configuration for score components */
const WEIGHTS = {
  semanticSimilarity: 0.4,
  keywordOverlap: 0.25,
  experienceFit: 0.2,
  constraintFit: 0.15,
} as const;

/** Score a single talent–job pair. Pure, no Effect. */
export const scorePair = (
  talent: Talent,
  jd: StructuredJd,
  semanticSimilarity: number
): ScoredPair => {
  const talentKeywords = new Set(talent.keywords.map((k) => k.toLowerCase()));
  const jdKeywords = new Set(jd.keywords.map((k) => k.toLowerCase()));

  const keywordOverlap = computeKeywordOverlap(talentKeywords, jdKeywords);

  const experienceFit = computeExperienceFit(
    talent.experienceYears,
    jd.experienceYearsMin,
    jd.experienceYearsMax
  );

  const constraintFit = computeConstraintFit(talent, jd);

  const breakdown = ScoreBreakdown.make({
    semanticSimilarity,
    keywordOverlap,
    experienceFit,
    constraintFit,
  });

  const totalScore =
    semanticSimilarity * WEIGHTS.semanticSimilarity +
    keywordOverlap * WEIGHTS.keywordOverlap +
    experienceFit * WEIGHTS.experienceFit +
    constraintFit * WEIGHTS.constraintFit;

  return { talentId: talent.id, jobId: jd.id, breakdown, totalScore };
};

/** Score and rank multiple talent–job pairs, returning top N sorted desc. */
export const scoreAndRank = (
  pairs: ReadonlyArray<{
    talent: Talent;
    jd: StructuredJd;
    semanticSimilarity: number;
  }>,
  limit: number
): readonly ScoredPair[] =>
  pairs
    .map(({ talent, jd, semanticSimilarity }) =>
      scorePair(talent, jd, semanticSimilarity)
    )
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, limit);

/**
 * Score talents against a job. Wrapper around scoreAndRank for backward compat.
 * @deprecated Use scoreAndRank directly
 */
export const scoreTalents = (
  jd: StructuredJd,
  talents: readonly Talent[],
  candidates: readonly VectorCandidate[]
) => {
  const similarityMap = new Map(candidates.map((c) => [c.id, c.similarity]));
  const talentMap = new Map(talents.map((t) => [t.id, t]));

  const scored = scoreAndRank(
    talents.map((talent) => ({
      talent,
      jd,
      semanticSimilarity: similarityMap.get(talent.id) ?? 0,
    })),
    talents.length
  );

  return scored.flatMap((s) => {
    const talent = talentMap.get(s.talentId);
    if (!talent) {
      return [];
    }
    return [{ talent, breakdown: s.breakdown, totalScore: s.totalScore }];
  });
};

/** Overlap between two keyword sets (0-1) */
const computeKeywordOverlap = (
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
