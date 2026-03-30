import { JobDescriptionNotFoundError } from "@workspace/core/domain/errors";
import { StructuredJd } from "@workspace/core/domain/models/job-description";
import { JobDescriptionRepository } from "@workspace/core/ports/job-description-repository";
import { eq, inArray } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { DrizzleClient } from "../client";
import { jobDescriptions } from "../schema/job-descriptions";

type JdRow = typeof jobDescriptions.$inferSelect;

/**
 * Compile-time safety: widen DB enum columns to plain string so
 * `Schema.decodeUnknownSync` can validate them at runtime.
 */
type JdInput = {
  [K in keyof Schema.Schema.Encoded<typeof StructuredJd>]: K extends
    | "seniority"
    | "employmentType"
    | "workMode"
    | "status"
    ? string
    : Schema.Schema.Encoded<typeof StructuredJd>[K];
};

const toInput = (row: JdRow): JdInput => ({
  id: row.id,
  organizationId: row.organizationId,
  rawText: row.rawText,
  summary: row.summary,
  roleTitle: row.roleTitle,
  keywords: row.keywords,
  seniority: row.seniority,
  employmentType: row.employmentType,
  workMode: row.workMode,
  location: row.location,
  willingToSponsorRelocation: row.willingToSponsorRelocation,
  experienceYearsMin: row.experienceYearsMin,
  experienceYearsMax: row.experienceYearsMax,
  status: row.status,
  questions: row.questions as JdInput["questions"],
  createdAt: row.createdAt.toISOString(),
});

const decodeJd = Schema.decodeUnknownSync(StructuredJd);
const toDomain = (row: JdRow): StructuredJd => decodeJd(toInput(row));

export const JobDescriptionRepositoryPostgresLayer = Layer.effect(
  JobDescriptionRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleClient;

    return JobDescriptionRepository.of({
      create: (jd) =>
        Effect.gen(function* () {
          yield* Effect.promise(() =>
            db.insert(jobDescriptions).values({
              ...jd,
              keywords: [...jd.keywords],
              questions: [...jd.questions],
            })
          );
          return jd;
        }),

      findById: (id) =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() =>
            db.select().from(jobDescriptions).where(eq(jobDescriptions.id, id))
          );
          const row = rows[0];
          if (!row) {
            return yield* new JobDescriptionNotFoundError({
              jobDescriptionId: id,
            });
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
              .from(jobDescriptions)
              .where(inArray(jobDescriptions.id, [...ids]))
          );
          return rows.map(toDomain);
        }),

      findAll: () =>
        Effect.gen(function* () {
          const rows = yield* Effect.promise(() =>
            db.select().from(jobDescriptions)
          );
          return rows.map(toDomain);
        }),

      updateStatus: (id, status) =>
        Effect.gen(function* () {
          const result = yield* Effect.promise(() =>
            db
              .update(jobDescriptions)
              .set({ status })
              .where(eq(jobDescriptions.id, id))
              .returning({ id: jobDescriptions.id })
          );
          if (result.length === 0) {
            return yield* new JobDescriptionNotFoundError({
              jobDescriptionId: id,
            });
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
              .update(jobDescriptions)
              .set(setData)
              .where(eq(jobDescriptions.id, id))
              .returning()
          );
          const row = result[0];
          if (!row) {
            return yield* new JobDescriptionNotFoundError({
              jobDescriptionId: id,
            });
          }
          return toDomain(row);
        }),
    });
  })
);
