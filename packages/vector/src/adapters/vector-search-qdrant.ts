import {
  VectorNotFoundError,
  VectorSearchError,
} from "@workspace/core/domain/errors";
import type {
  JobDescriptionId,
  TalentId,
} from "@workspace/core/domain/models/ids";
import type { Vector } from "@workspace/core/domain/models/vector";
import {
  type JobFilter,
  type JobPayload,
  type TalentFilter,
  type TalentPayload,
  VectorSearchPort,
} from "@workspace/core/ports/vector-search-port";
import { Effect, Layer } from "effect";
import { QdrantClientService } from "../client";

const TALENTS = "talents";
const JOBS = "jobs";

/** Build Qdrant filter conditions for talent search */
const buildTalentFilter = (filter?: TalentFilter) => {
  const must: Record<string, unknown>[] = [
    { key: "status", match: { value: "matched" } },
  ];

  if (filter?.workModes?.length) {
    must.push({ key: "workModes", match: { any: [...filter.workModes] } });
  }

  if (filter?.location) {
    const should: Record<string, unknown>[] = [
      { key: "location", match: { value: filter.location } },
    ];
    if (filter.willingToRelocate) {
      should.push({ key: "willingToRelocate", match: { value: true } });
    }
    must.push({ should });
  }

  return { must };
};

/** Build Qdrant filter conditions for job search */
const buildJobFilter = (filter?: JobFilter) => {
  const must: Record<string, unknown>[] = [
    { key: "status", match: { value: "ready" } },
  ];

  if (filter?.workModes?.length) {
    must.push({ key: "workMode", match: { any: [...filter.workModes] } });
  }

  if (filter?.location) {
    const should: Record<string, unknown>[] = [
      { key: "location", match: { value: filter.location } },
    ];
    if (filter.willingToSponsorRelocation) {
      should.push({
        key: "willingToSponsorRelocation",
        match: { value: true },
      });
    }
    must.push({ should });
  }

  return { must };
};

/** Wrap Qdrant client calls in Effect, mapping errors to VectorSearchError */
const tryQdrant = <A>(label: string, f: () => Promise<A>) => {
  return Effect.tryPromise({
    try: f,
    catch: (cause) =>
      new VectorSearchError({ message: `Qdrant ${label} failed`, cause }),
  });
};

export const VectorSearchQdrantLayer = Layer.effect(
  VectorSearchPort,
  Effect.gen(function* () {
    const qdrant = yield* QdrantClientService;

    return VectorSearchPort.of({
      upsertTalent: (id: TalentId, vector: Vector, payload: TalentPayload) =>
        tryQdrant("upsertTalent", () =>
          qdrant.upsert(TALENTS, {
            points: [{ id, vector: [...vector], payload: { ...payload } }],
          })
        ).pipe(Effect.asVoid),

      upsertJob: (id: JobDescriptionId, vector: Vector, payload: JobPayload) =>
        tryQdrant("upsertJob", () =>
          qdrant.upsert(JOBS, {
            points: [{ id, vector: [...vector], payload: { ...payload } }],
          })
        ).pipe(Effect.asVoid),

      searchTalentsByJobId: (
        jobId: JobDescriptionId,
        topK: number,
        filter?: TalentFilter
      ) =>
        Effect.gen(function* () {
          const [jobPoint] = yield* tryQdrant("retrieve job vector", () =>
            qdrant.retrieve(JOBS, {
              ids: [jobId],
              with_vector: true,
              with_payload: false,
            })
          );

          if (!jobPoint?.vector) {
            return yield* new VectorNotFoundError({
              collection: JOBS,
              pointId: jobId,
            });
          }

          const results = yield* tryQdrant("search talents", () =>
            qdrant.search(TALENTS, {
              vector: jobPoint.vector as number[],
              limit: topK,
              filter: buildTalentFilter(filter),
              with_payload: false,
            })
          );

          return results.map((r) => ({
            id: r.id as string,
            similarity: r.score,
          }));
        }),

      searchJobsByTalentId: (
        talentId: TalentId,
        topK: number,
        filter?: JobFilter
      ) =>
        Effect.gen(function* () {
          const [talentPoint] = yield* tryQdrant("retrieve talent vector", () =>
            qdrant.retrieve(TALENTS, {
              ids: [talentId],
              with_vector: true,
              with_payload: false,
            })
          );

          if (!talentPoint?.vector) {
            return yield* new VectorNotFoundError({
              collection: TALENTS,
              pointId: talentId,
            });
          }

          const results = yield* tryQdrant("search jobs", () =>
            qdrant.search(JOBS, {
              vector: talentPoint.vector as number[],
              limit: topK,
              filter: buildJobFilter(filter),
              with_payload: false,
            })
          );

          return results.map((r) => ({
            id: r.id as string,
            similarity: r.score,
          }));
        }),

      deleteTalent: (id: TalentId) =>
        tryQdrant("deleteTalent", () =>
          qdrant.delete(TALENTS, { points: [id] })
        ).pipe(Effect.asVoid),

      deleteJob: (id: JobDescriptionId) =>
        tryQdrant("deleteJob", () =>
          qdrant.delete(JOBS, { points: [id] })
        ).pipe(Effect.asVoid),

      updateTalentPayload: (id: TalentId, payload: Partial<TalentPayload>) =>
        tryQdrant("updateTalentPayload", () =>
          qdrant.setPayload(TALENTS, { payload: { ...payload }, points: [id] })
        ).pipe(Effect.asVoid),

      updateJobPayload: (id: JobDescriptionId, payload: Partial<JobPayload>) =>
        tryQdrant("updateJobPayload", () =>
          qdrant.setPayload(JOBS, { payload: { ...payload }, points: [id] })
        ).pipe(Effect.asVoid),
    });
  })
);
