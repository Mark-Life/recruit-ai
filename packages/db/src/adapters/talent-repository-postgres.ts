import { TalentNotFoundError } from "@workspace/core/domain/errors";
import { Talent } from "@workspace/core/domain/models/talent";
import { TalentRepository } from "@workspace/core/ports/talent-repository";
import { eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { DrizzleClient } from "../client";
import { talents } from "../schema/talents";

type TalentRow = typeof talents.$inferSelect;

/**
 * Compile-time safety: the return type is Encoded<Talent>, so if the
 * domain model adds/removes/renames a field, this function will error
 * until the mapping (and Drizzle schema) are updated.
 *
 * DB stores enums as plain strings — `decodeSync` validates them at
 * runtime, so we widen string-enum fields via the Record index here.
 */
type TalentInput = {
  [K in keyof Schema.Schema.Encoded<typeof Talent>]: K extends "workModes"
    ? readonly string[]
    : Schema.Schema.Encoded<typeof Talent>[K];
};

const toInput = (row: TalentRow): TalentInput => ({
  id: row.id,
  name: row.name,
  title: row.title,
  skills: row.skills,
  keywords: row.keywords,
  experienceYears: row.experienceYears,
  location: row.location,
  workModes: row.workModes,
  willingToRelocate: row.willingToRelocate,
  recruiterId: row.recruiterId,
});

const decodeTalent = Schema.decodeUnknownSync(Talent);
const toDomain = (row: TalentRow): Talent => decodeTalent(toInput(row));

export const TalentRepositoryPostgresLayer = Layer.effect(
  TalentRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleClient;

    return TalentRepository.of({
      findById: (id) =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() =>
            db.select().from(talents).where(eq(talents.id, id))
          );
          const row = rows[0];
          if (!row) {
            return yield* new TalentNotFoundError({ talentId: id });
          }
          return toDomain(row);
        }),

      findAll: () =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() => db.select().from(talents));
          return rows.map(toDomain);
        }),
    });
  })
);
