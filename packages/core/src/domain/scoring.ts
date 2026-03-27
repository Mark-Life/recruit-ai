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
 * Hard constraint filter — removes talents that cannot possibly match.
 * Work mode must be compatible, and for non-remote JDs the talent must
 * be in the right location or have a viable relocation path.
 */
export function filterByHardConstraints(
  jd: StructuredJd,
  talents: readonly Talent[]
): readonly Talent[] {
  return talents.filter((talent) => {
    if (!talent.workModes.includes(jd.workMode)) {
      return false;
    }

    if (jd.workMode !== "remote") {
      const talentLoc = talent.location.toLowerCase();
      const jdLoc = jd.location.toLowerCase();
      const locationMatch =
        talentLoc.includes(jdLoc) || jdLoc.includes(talentLoc);
      if (
        !(
          locationMatch ||
          (talent.willingToRelocate && jd.willingToSponsorRelocation)
        )
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Pure scoring — no Effect services, fully testable.
 * Combines semantic similarity from vector search with keyword overlap,
 * experience alignment, and hard constraint checks.
 */
export function scoreTalents(
  jd: StructuredJd,
  talents: readonly Talent[],
  candidates: readonly VectorCandidate[]
): readonly ScoredTalent[] {
  const similarityMap = new Map(
    candidates.map((c) => [c.talentId, c.similarity])
  );

  const jdSkills = new Set(jd.skills.map((s) => s.toLowerCase()));
  const jdKeywords = new Set(jd.keywords.map((k) => k.toLowerCase()));

  return talents
    .map((talent) => {
      const semanticSimilarity = similarityMap.get(talent.id) ?? 0;

      const keywordOverlap = computeKeywordOverlap(
        talent.skills,
        talent.keywords,
        jdSkills,
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

      return { talent, breakdown, totalScore };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}

/** Jaccard-style overlap between talent tags and JD tags (0–1) */
function computeKeywordOverlap(
  talentSkills: readonly string[],
  talentKeywords: readonly string[],
  jdSkills: ReadonlySet<string>,
  jdKeywords: ReadonlySet<string>
): number {
  const talentTags = new Set(
    [...talentSkills, ...talentKeywords].map((t) => t.toLowerCase())
  );
  const jdTags = new Set([...jdSkills, ...jdKeywords]);

  if (jdTags.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const tag of talentTags) {
    if (jdTags.has(tag)) {
      overlap++;
    }
  }

  return overlap / jdTags.size;
}

/** 1.0 if within range, degrades linearly outside (0–1) */
function computeExperienceFit(years: number, min: number, max: number): number {
  if (years >= min && years <= max) {
    return 1;
  }

  const distance = years < min ? min - years : years - max;
  const range = max - min || 1;
  return Math.max(0, 1 - distance / range);
}

/** Hard + soft constraint check for location, work mode, relocation (0–1) */
function computeConstraintFit(talent: Talent, jd: StructuredJd): number {
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
}
