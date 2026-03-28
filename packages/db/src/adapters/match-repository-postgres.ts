import { Match } from "@workspace/core/domain/models/match";
import { MatchRepository } from "@workspace/core/ports/match-repository";
import { eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { DrizzleClient } from "../client";
import { matches } from "../schema/matches";

type MatchRow = typeof matches.$inferSelect;

/**
 * The DB stores score breakdown as flat columns, but the domain model
 * nests them under `breakdown: ScoreBreakdown`. Reassemble here.
 */
const toInput = (row: MatchRow): Schema.Schema.Encoded<typeof Match> => ({
  id: row.id,
  jobDescriptionId: row.jobDescriptionId,
  talentId: row.talentId,
  recruiterId: row.recruiterId,
  totalScore: row.totalScore,
  breakdown: {
    semanticSimilarity: row.semanticSimilarity,
    keywordOverlap: row.keywordOverlap,
    experienceFit: row.experienceFit,
    constraintFit: row.constraintFit,
  },
});

const decodeMatch = Schema.decodeUnknownSync(Match);
const toDomain = (row: MatchRow): Match => decodeMatch(toInput(row));

const toRow = (match: Match) => ({
  id: match.id,
  jobDescriptionId: match.jobDescriptionId,
  talentId: match.talentId,
  recruiterId: match.recruiterId,
  totalScore: match.totalScore,
  semanticSimilarity: match.breakdown.semanticSimilarity,
  keywordOverlap: match.breakdown.keywordOverlap,
  experienceFit: match.breakdown.experienceFit,
  constraintFit: match.breakdown.constraintFit,
});

export const MatchRepositoryPostgresLayer = Layer.effect(
  MatchRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleClient;

    return MatchRepository.of({
      createMany: (matchList) =>
        Effect.gen(function* () {
          if (matchList.length === 0) {
            return [];
          }
          const values = matchList.map(toRow);
          yield* Effect.promise(() => db.insert(matches).values([...values]));
          return matchList;
        }),

      findByJobDescriptionId: (id) =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() =>
            db.select().from(matches).where(eq(matches.jobDescriptionId, id))
          );
          return rows.map(toDomain);
        }),

      findByTalentId: (id) =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() =>
            db.select().from(matches).where(eq(matches.talentId, id))
          );
          return rows.map(toDomain);
        }),
    });
  })
);
