import { Context, Effect, Layer, Ref, Schema, Stream } from "effect";
import {
  type EmbeddingError,
  type JobDescriptionNotFoundError,
  LlmError,
  type TalentNotFoundError,
  type VectorNotFoundError,
  type VectorSearchError,
} from "../domain/errors";
import type { ClarifyingAnswer } from "../domain/jd-enrichment";
import { mergeAnswersIntoJd } from "../domain/jd-enrichment";
import type { ClarifyingQuestionsExtractionOutput } from "../domain/models/clarifying-question";
import type { OrganizationId } from "../domain/models/ids";
import { JobDescriptionId } from "../domain/models/ids";
import { JdExtraction } from "../domain/models/jd-extraction";
import {
  StructuredJd,
  type UpdateJobInput,
} from "../domain/models/job-description";
import type { Match } from "../domain/models/match";
import { EmbeddingPort } from "../ports/embedding-port";
import { JobDescriptionRepository } from "../ports/job-description-repository";
import type { DeepPartial } from "../ports/llm-port";
import { LlmPort } from "../ports/llm-port";
import { type JobPayload, VectorSearchPort } from "../ports/vector-search-port";
import { RankingService } from "./ranking-service";

const JOB_SEMANTIC_FIELDS = ["summary"] as const;

const JOB_PAYLOAD_KEYS = [
  "keywords",
  "workMode",
  "location",
  "willingToSponsorRelocation",
  "experienceYearsMin",
  "experienceYearsMax",
] as const;

const extractJobPayloadChanges = (
  data: UpdateJobInput
): Partial<JobPayload> => {
  const result: Record<string, unknown> = {};
  for (const key of JOB_PAYLOAD_KEYS) {
    if (data[key] !== undefined) {
      const val = data[key];
      result[key] = Array.isArray(val) ? [...val] : val;
    }
  }
  return result as Partial<JobPayload>;
};

/** Decode a DeepPartial<JdExtraction> into a validated JdExtraction, mapping ParseError to LlmError. */
const decodeJdExtraction = (raw: DeepPartial<JdExtraction>) =>
  Schema.decodeUnknown(JdExtraction)(raw).pipe(
    Effect.mapError(
      (parseError) =>
        new LlmError({
          message: `LLM output failed JdExtraction validation: ${parseError.message}`,
        })
    )
  );

export interface CreateJobStreamOutput {
  readonly jd?: DeepPartial<JdExtraction>;
  readonly questions?: DeepPartial<ClarifyingQuestionsExtractionOutput>;
}

type SubmitAnswersError =
  | LlmError
  | EmbeddingError
  | VectorSearchError
  | VectorNotFoundError
  | JobDescriptionNotFoundError;

type MatchingError =
  | VectorSearchError
  | VectorNotFoundError
  | TalentNotFoundError
  | JobDescriptionNotFoundError;

type ExtractJobError = LlmError | JobDescriptionNotFoundError;

export class JobOrchestrationService extends Context.Tag(
  "@recruit/JobOrchestrationService"
)<
  JobOrchestrationService,
  {
    /** Insert a draft row with placeholder extraction fields. */
    readonly createDraft: (params: {
      readonly rawText: string;
      readonly title: string;
      readonly organizationId: OrganizationId;
    }) => Effect.Effect<StructuredJd>;

    readonly createJob: (params: {
      readonly rawText: string;
      readonly title: string;
      readonly organizationId: OrganizationId;
    }) => Stream.Stream<CreateJobStreamOutput, LlmError>;

    /** Load a draft job by ID, stream LLM extraction + questions, then persist. */
    readonly extractJob: (
      id: JobDescriptionId
    ) => Stream.Stream<CreateJobStreamOutput, ExtractJobError>;

    readonly submitAnswers: (
      id: JobDescriptionId,
      answers: readonly ClarifyingAnswer[]
    ) => Stream.Stream<DeepPartial<StructuredJd>, SubmitAnswersError>;

    readonly runMatching: (
      id: JobDescriptionId
    ) => Effect.Effect<readonly Match[], MatchingError>;

    /** Update individual fields on a job, re-embedding only when semantic fields change. */
    readonly updateJob: (
      id: JobDescriptionId,
      data: UpdateJobInput
    ) => Effect.Effect<
      StructuredJd,
      JobDescriptionNotFoundError | EmbeddingError | VectorSearchError
    >;
  }
>() {
  static readonly layer = Layer.effect(
    JobOrchestrationService,
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const jdRepo = yield* JobDescriptionRepository;
      const ranking = yield* RankingService;
      const embeddingPort = yield* EmbeddingPort;
      const vectorSearch = yield* VectorSearchPort;

      return JobOrchestrationService.of({
        createDraft: (params) =>
          jdRepo.create(
            StructuredJd.make({
              id: JobDescriptionId.make(crypto.randomUUID()),
              organizationId: params.organizationId,
              rawText: params.rawText,
              roleTitle: params.title,
              summary: "",
              keywords: [],
              seniority: "mid",
              employmentType: "full-time",
              workMode: "remote",
              location: "",
              willingToSponsorRelocation: false,
              experienceYearsMin: 0,
              experienceYearsMax: 0,
              status: "draft",
              questions: [],
              createdAt: new Date(),
            })
          ),

        createJob: (params) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const jdRef = yield* Ref.make<DeepPartial<JdExtraction>>({});

              const jdPhase = llm
                .streamStructureJd({ raw: params.rawText })
                .pipe(
                  Stream.tap((partial) => Ref.set(jdRef, partial)),
                  Stream.map((jd): CreateJobStreamOutput => ({ jd }))
                );

              const persistAndQuestionsPhase = Stream.unwrap(
                Effect.gen(function* () {
                  const finalJd = yield* decodeJdExtraction(
                    yield* Ref.get(jdRef)
                  );

                  yield* jdRepo.create(
                    StructuredJd.make({
                      ...finalJd,
                      id: JobDescriptionId.make(crypto.randomUUID()),
                      organizationId: params.organizationId,
                      rawText: params.rawText,
                      status: "refining",
                      createdAt: new Date(),
                    })
                  );

                  return llm
                    .streamClarifyingQuestions(params.rawText, finalJd)
                    .pipe(
                      Stream.map(
                        (questions): CreateJobStreamOutput => ({
                          jd: finalJd,
                          questions,
                        })
                      )
                    );
                })
              );

              return Stream.concat(jdPhase, persistAndQuestionsPhase);
            })
          ),

        extractJob: (id) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const existingJd = yield* jdRepo.findById(id);
              const jdRef = yield* Ref.make<DeepPartial<JdExtraction>>({});
              const questionsRef = yield* Ref.make<
                DeepPartial<ClarifyingQuestionsExtractionOutput>
              >({});

              const jdPhase = llm
                .streamStructureJd({ raw: existingJd.rawText })
                .pipe(
                  Stream.tap((partial) => Ref.set(jdRef, partial)),
                  Stream.map((jd): CreateJobStreamOutput => ({ jd }))
                );

              const persistAndQuestionsPhase = Stream.unwrap(
                Effect.gen(function* () {
                  const finalJd = yield* decodeJdExtraction(
                    yield* Ref.get(jdRef)
                  );

                  yield* jdRepo.update(id, {
                    ...finalJd,
                    status: "refining",
                  });

                  return llm
                    .streamClarifyingQuestions(existingJd.rawText, finalJd)
                    .pipe(
                      Stream.tap((partial) => Ref.set(questionsRef, partial)),
                      Stream.map(
                        (questions): CreateJobStreamOutput => ({
                          jd: finalJd,
                          questions,
                        })
                      )
                    );
                })
              );

              const persistQuestionsPhase = Stream.fromEffect(
                Effect.gen(function* () {
                  const finalQuestions = yield* Ref.get(questionsRef);
                  const questionsList = (finalQuestions.questions ??
                    []) as ClarifyingQuestionsExtractionOutput["questions"];
                  yield* jdRepo.update(id, { questions: questionsList });
                })
              ).pipe(Stream.drain);

              return Stream.concat(
                Stream.concat(jdPhase, persistAndQuestionsPhase),
                persistQuestionsPhase
              );
            })
          ),

        submitAnswers: (id, answers) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const jd = yield* jdRepo.findById(id);
              const enrichedText = mergeAnswersIntoJd(jd.rawText, answers);
              const jdRef = yield* Ref.make<DeepPartial<JdExtraction>>({});

              const extractionStream = llm
                .streamStructureJd({ raw: enrichedText })
                .pipe(
                  Stream.tap((partial) => Ref.set(jdRef, partial)),
                  Stream.map(
                    (extraction): DeepPartial<StructuredJd> => ({
                      ...extraction,
                      id: jd.id,
                      organizationId: jd.organizationId,
                      rawText: enrichedText,
                      status: "refining",
                      createdAt: jd.createdAt,
                    })
                  )
                );

              const persistPhase = Stream.fromEffect(
                Effect.gen(function* () {
                  const finalExtraction = yield* decodeJdExtraction(
                    yield* Ref.get(jdRef)
                  );

                  yield* jdRepo.update(id, {
                    ...finalExtraction,
                    rawText: enrichedText,
                    status: "ready",
                  });

                  const embedding = yield* embeddingPort.embed(
                    finalExtraction.summary
                  );
                  yield* vectorSearch.upsertJob(id, embedding, {
                    keywords: [...finalExtraction.keywords],
                    workMode: finalExtraction.workMode,
                    location: finalExtraction.location,
                    willingToSponsorRelocation:
                      finalExtraction.willingToSponsorRelocation,
                    experienceYearsMin: finalExtraction.experienceYearsMin,
                    experienceYearsMax: finalExtraction.experienceYearsMax,
                    status: "ready",
                  });
                })
              ).pipe(Stream.drain);

              return Stream.concat(extractionStream, persistPhase);
            })
          ),

        runMatching: (id) => ranking.rankTalentsByJob(id),

        updateJob: (id, data) =>
          Effect.gen(function* () {
            const updated = yield* jdRepo.update(id, data);

            const needsReEmbed = JOB_SEMANTIC_FIELDS.some(
              (k) => data[k] !== undefined
            );

            if (needsReEmbed) {
              const embedding = yield* embeddingPort.embed(updated.summary);
              yield* vectorSearch.upsertJob(id, embedding, {
                keywords: [...updated.keywords],
                workMode: updated.workMode,
                location: updated.location,
                willingToSponsorRelocation: updated.willingToSponsorRelocation,
                experienceYearsMin: updated.experienceYearsMin,
                experienceYearsMax: updated.experienceYearsMax,
                status: updated.status,
              });
            } else {
              const payloadChanges = extractJobPayloadChanges(data);
              if (Object.keys(payloadChanges).length > 0) {
                yield* vectorSearch.updateJobPayload(id, payloadChanges);
              }
            }

            return updated;
          }),
      });
    })
  );
}
