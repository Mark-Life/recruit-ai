import { RecruiterNotFoundError } from "@workspace/core/domain/errors";
import { Recruiter } from "@workspace/core/domain/models/recruiter";
import { RecruiterRepository } from "@workspace/core/ports/recruiter-repository";
import { eq, inArray } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { DrizzleClient } from "../client";
import { recruiters } from "../schema/recruiters";
import { talents } from "../schema/talents";

const decodeRecruiter = Schema.decodeUnknownSync(Recruiter);

const toDomain = (
  row: typeof recruiters.$inferSelect,
  talentIds: readonly string[]
): Recruiter =>
  decodeRecruiter({
    id: row.id,
    name: row.name,
    email: row.email,
    talentIds,
  });

export const RecruiterRepositoryPostgresLayer = Layer.effect(
  RecruiterRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleClient;

    const findTalentIds = (recruiterId: string) =>
      Effect.promise(() =>
        db
          .select({ id: talents.id })
          .from(talents)
          .where(eq(talents.recruiterId, recruiterId))
      ).pipe(Effect.map((rows) => rows.map((r) => r.id)));

    return RecruiterRepository.of({
      findById: (id) =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() =>
            db.select().from(recruiters).where(eq(recruiters.id, id))
          );
          const row = rows[0];
          if (!row) {
            return yield* new RecruiterNotFoundError({ recruiterId: id });
          }
          const talentIds = yield* findTalentIds(id);
          return toDomain(row, talentIds);
        }),

      findByTalentIds: (talentIds) =>
        Effect.gen(function* () {
          if (talentIds.length === 0) {
            return [];
          }

          const talentRows = yield* Effect.promise(() =>
            db
              .select({ recruiterId: talents.recruiterId })
              .from(talents)
              .where(inArray(talents.id, [...talentIds]))
          );
          const recruiterIds = [
            ...new Set(talentRows.map((r) => r.recruiterId)),
          ];

          if (recruiterIds.length === 0) {
            return [];
          }

          const recruiterRows = yield* Effect.promise(() =>
            db
              .select()
              .from(recruiters)
              .where(inArray(recruiters.id, recruiterIds))
          );

          return yield* Effect.forEach(
            recruiterRows,
            (row) =>
              findTalentIds(row.id).pipe(
                Effect.map((tIds) => toDomain(row, tIds))
              ),
            { concurrency: "unbounded" }
          );
        }),
    });
  })
);
