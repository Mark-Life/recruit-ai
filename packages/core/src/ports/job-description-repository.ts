import { Context, type Effect } from "effect";
import type { JobDescriptionNotFoundError } from "../domain/errors";
import type { JobDescriptionId } from "../domain/models/ids";
import type { JobStatus, StructuredJd } from "../domain/models/job-description";

export class JobDescriptionRepository extends Context.Tag(
  "@recruit/JobDescriptionRepository"
)<
  JobDescriptionRepository,
  {
    readonly create: (jd: StructuredJd) => Effect.Effect<StructuredJd>;
    readonly findById: (
      id: JobDescriptionId
    ) => Effect.Effect<StructuredJd, JobDescriptionNotFoundError>;
    readonly findAll: () => Effect.Effect<readonly StructuredJd[]>;
    readonly updateStatus: (
      id: JobDescriptionId,
      status: JobStatus
    ) => Effect.Effect<void, JobDescriptionNotFoundError>;
    readonly update: (
      id: JobDescriptionId,
      data: Partial<Omit<StructuredJd, "id" | "organizationId">>
    ) => Effect.Effect<StructuredJd, JobDescriptionNotFoundError>;
  }
>() {}
