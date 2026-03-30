import { TalentNotFoundError } from "@workspace/core/domain/errors";
import { Talent } from "@workspace/core/domain/models/talent";
import { TalentRepository } from "@workspace/core/ports/talent-repository";
import { eq, inArray } from "drizzle-orm";
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
    : K extends "status"
      ? string
      : K extends "resumeText" | "resumePdfBase64"
        ? string | null
        : Schema.Schema.Encoded<typeof Talent>[K];
};

const toInput = (row: TalentRow): TalentInput => ({
  id: row.id,
  name: row.name,
  title: row.title,
  keywords: row.keywords,
  experienceYears: row.experienceYears,
  location: row.location,
  workModes: row.workModes,
  willingToRelocate: row.willingToRelocate,
  resumeText: row.resumeText,
  resumePdfBase64: row.resumePdfBase64,
  recruiterId: row.recruiterId,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
});

const decodeTalent = Schema.decodeUnknownSync(Talent);
const toDomain = (row: TalentRow): Talent => decodeTalent(toInput(row));

export const TalentRepositoryPostgresLayer = Layer.effect(
  TalentRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleClient;

    return TalentRepository.of({
      create: (talent) =>
        Effect.gen(function* () {
          const values: typeof talents.$inferInsert = {
            id: talent.id,
            name: talent.name,
            title: talent.title,
            keywords: [...talent.keywords],
            experienceYears: talent.experienceYears,
            location: talent.location,
            workModes: [...talent.workModes],
            willingToRelocate: talent.willingToRelocate,
            resumeText: talent.resumeText ?? null,
            resumePdfBase64: talent.resumePdfBase64 ?? null,
            recruiterId: talent.recruiterId,
            status: talent.status,
            createdAt: talent.createdAt,
          };
          yield* Effect.promise(() => db.insert(talents).values(values));
          return talent;
        }),

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

      findByIds: (ids) =>
        Effect.gen(function* () {
          if (ids.length === 0) {
            return [];
          }
          const rows = yield* Effect.promise(() =>
            db
              .select()
              .from(talents)
              .where(inArray(talents.id, [...ids]))
          );
          return rows.map(toDomain);
        }),

      findAll: () =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() => db.select().from(talents));
          return rows.map(toDomain);
        }),

      updateKeywords: (id, keywords) =>
        Effect.gen(function* () {
          const result = yield* Effect.promise(() =>
            db
              .update(talents)
              .set({ keywords: [...keywords] })
              .where(eq(talents.id, id))
              .returning({ id: talents.id })
          );
          if (result.length === 0) {
            return yield* new TalentNotFoundError({ talentId: id });
          }
        }),

      updateStatus: (id, status) =>
        Effect.gen(function* () {
          const result = yield* Effect.promise(() =>
            db
              .update(talents)
              .set({ status })
              .where(eq(talents.id, id))
              .returning({ id: talents.id })
          );
          if (result.length === 0) {
            return yield* new TalentNotFoundError({ talentId: id });
          }
        }),

      update: (id, data) =>
        Effect.gen(function* () {
          const setData: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(data)) {
            setData[key] = Array.isArray(value) ? [...value] : value;
          }
          const result = yield* Effect.promise(() =>
            db
              .update(talents)
              .set(setData)
              .where(eq(talents.id, id))
              .returning()
          );
          const row = result[0];
          if (!row) {
            return yield* new TalentNotFoundError({ talentId: id });
          }
          return toDomain(row);
        }),
    });
  })
);
