import { Context, Effect, Layer, Ref, Stream } from "effect";
import type {
  EmbeddingError,
  JobDescriptionNotFoundError,
  LlmError,
  TalentNotFoundError,
  VectorSearchError,
} from "../domain/errors";
import type { ClarifyingAnswer } from "../domain/jd-enrichment";
import { mergeAnswersIntoJd } from "../domain/jd-enrichment";
import type { ClarifyingQuestionsExtractionOutput } from "../domain/models/clarifying-question";
import type { JobDescriptionId, OrganizationId } from "../domain/models/ids";
import type { JdExtraction } from "../domain/models/jd-extraction";
import type { StructuredJd } from "../domain/models/job-description";
import type { Match } from "../domain/models/match";
import { JobDescriptionRepository } from "../ports/job-description-repository";
import type { DeepPartial } from "../ports/llm-port";
import { LlmPort } from "../ports/llm-port";
import { MatchRepository } from "../ports/match-repository";
import { RankingService } from "./ranking-service";

export interface CreateJobStreamOutput {
  readonly jd?: DeepPartial<JdExtraction>;
  readonly questions?: DeepPartial<ClarifyingQuestionsExtractionOutput>;
}

type SubmitAnswersError = LlmError | JobDescriptionNotFoundError;

type MatchingError =
  | LlmError
  | EmbeddingError
  | VectorSearchError
  | TalentNotFoundError
  | JobDescriptionNotFoundError;

export class JobOrchestrationService extends Context.Tag(
  "@recruit/JobOrchestrationService"
)<
  JobOrchestrationService,
  {
    readonly createJob: (params: {
      readonly rawText: string;
      readonly title: string;
      readonly organizationId: OrganizationId;
    }) => Stream.Stream<CreateJobStreamOutput, LlmError>;

    readonly submitAnswers: (
      id: JobDescriptionId,
      answers: readonly ClarifyingAnswer[]
    ) => Stream.Stream<DeepPartial<StructuredJd>, SubmitAnswersError>;

    readonly runMatching: (
      id: JobDescriptionId
    ) => Effect.Effect<readonly Match[], MatchingError>;
  }
>() {
  static readonly layer = Layer.effect(
    JobOrchestrationService,
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const jdRepo = yield* JobDescriptionRepository;
      const matchRepo = yield* MatchRepository;
      const ranking = yield* RankingService;

      return JobOrchestrationService.of({
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
                  const finalJd = yield* Ref.get(jdRef);

                  yield* jdRepo.create({
                    ...(finalJd as JdExtraction),
                    id: crypto.randomUUID() as JobDescriptionId,
                    organizationId: params.organizationId,
                    rawText: params.rawText,
                    status: "refining",
                    createdAt: new Date().toISOString(),
                  } as StructuredJd);

                  return llm.streamClarifyingQuestions(params.rawText).pipe(
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
                  const finalExtraction = yield* Ref.get(jdRef);
                  yield* jdRepo.update(id, {
                    ...(finalExtraction as JdExtraction),
                    rawText: enrichedText,
                    status: "ready",
                  });
                })
              ).pipe(Stream.drain);

              return Stream.concat(extractionStream, persistPhase);
            })
          ),

        runMatching: (id) =>
          Effect.gen(function* () {
            const jd = yield* jdRepo.findById(id);
            const matches = yield* ranking.rankTalents(
              jd.rawText,
              jd.organizationId
            );
            yield* matchRepo.createMany(matches);
            return matches;
          }),
      });
    })
  );
}
