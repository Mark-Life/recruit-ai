import { Schema } from "effect";
import { JobDescriptionId, MatchId, RecruiterId, TalentId } from "./ids";

export class ScoreBreakdown extends Schema.Class<ScoreBreakdown>(
  "ScoreBreakdown"
)({
  semanticSimilarity: Schema.Number,
  keywordOverlap: Schema.Number,
  experienceFit: Schema.Number,
  constraintFit: Schema.Number,
}) {}

export class Match extends Schema.Class<Match>("Match")({
  id: MatchId,
  jobDescriptionId: JobDescriptionId,
  talentId: TalentId,
  recruiterId: RecruiterId,
  totalScore: Schema.Number,
  breakdown: ScoreBreakdown,
}) {}
