import { Context, type Effect } from "effect";
import type { VectorSearchError } from "../domain/errors";
import type { JobDescriptionId, TalentId } from "../domain/models/ids";
import type { Vector } from "../domain/models/vector";

export interface VectorCandidate {
  readonly id: string;
  readonly similarity: number;
}

export interface TalentPayload {
  readonly experienceYears: number;
  readonly keywords: readonly string[];
  readonly location: string;
  readonly status: string;
  readonly willingToRelocate: boolean;
  readonly workModes: readonly string[];
}

export interface JobPayload {
  readonly experienceYearsMax: number;
  readonly experienceYearsMin: number;
  readonly keywords: readonly string[];
  readonly location: string;
  readonly status: string;
  readonly willingToSponsorRelocation: boolean;
  readonly workMode: string;
}

export interface TalentFilter {
  readonly location?: string;
  readonly willingToRelocate?: boolean;
  readonly workModes?: readonly string[];
}

export class VectorSearchPort extends Context.Tag("@recruit/VectorSearchPort")<
  VectorSearchPort,
  {
    /** Upsert talent vector + filterable payload */
    readonly upsertTalent: (
      id: TalentId,
      vector: Vector,
      payload: TalentPayload
    ) => Effect.Effect<void, VectorSearchError>;

    /** Upsert job vector + filterable payload */
    readonly upsertJob: (
      id: JobDescriptionId,
      vector: Vector,
      payload: JobPayload
    ) => Effect.Effect<void, VectorSearchError>;

    /** Top-K talents by cosine similarity, with hard constraint pre-filtering */
    readonly searchTalentsByJobId: (
      jobId: JobDescriptionId,
      topK: number,
      filter?: TalentFilter
    ) => Effect.Effect<readonly VectorCandidate[], VectorSearchError>;

    /** Top-K jobs by cosine similarity to a stored talent embedding */
    readonly searchJobsByTalentId: (
      talentId: TalentId,
      topK: number
    ) => Effect.Effect<readonly VectorCandidate[], VectorSearchError>;

    readonly deleteTalent: (
      id: TalentId
    ) => Effect.Effect<void, VectorSearchError>;

    readonly deleteJob: (
      id: JobDescriptionId
    ) => Effect.Effect<void, VectorSearchError>;
  }
>() {}
