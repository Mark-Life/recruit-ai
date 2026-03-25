import { TalentNotFoundError } from "@workspace/core/domain/errors";
import { Talent } from "@workspace/core/domain/models/talent";
import { TalentRepository } from "@workspace/core/ports/talent-repository";
import { eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { DrizzleClient } from "../client";
import { talents } from "../schema/talents";

const decodeTalent = Schema.decodeUnknownSync(Talent);

const toDomain = (row: typeof talents.$inferSelect): Talent =>
  decodeTalent({
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
