import { Context, Effect, Layer, Ref, Stream } from "effect";
import type {
  EmbeddingError,
  LlmError,
  TalentNotFoundError,
} from "../domain/errors";
import type { RecruiterId, TalentId } from "../domain/models/ids";
import type { ResumeExtraction } from "../domain/models/resume-extraction";
import { Talent } from "../domain/models/talent";
import type { DeepPartial } from "../ports/llm-port";
import { LlmPort } from "../ports/llm-port";
import { TalentRepository } from "../ports/talent-repository";
import { ProfileIngestionService } from "./profile-ingestion-service";

type CreateTalentError = LlmError | EmbeddingError;

export class TalentOrchestrationService extends Context.Tag(
  "@recruit/TalentOrchestrationService"
)<
  TalentOrchestrationService,
  {
    readonly createFromText: (params: {
      readonly name: string;
      readonly resumeText: string;
      readonly recruiterId: RecruiterId;
    }) => Stream.Stream<DeepPartial<ResumeExtraction>, CreateTalentError>;

    readonly createFromPdf: (params: {
      readonly name: string;
      readonly pdfBase64: string;
      readonly recruiterId: RecruiterId;
    }) => Stream.Stream<DeepPartial<ResumeExtraction>, CreateTalentError>;

    readonly confirmSkills: (
      id: TalentId,
      skills: readonly string[]
    ) => Effect.Effect<Talent, TalentNotFoundError>;
  }
>() {
  static readonly layer = Layer.effect(
    TalentOrchestrationService,
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const talentRepo = yield* TalentRepository;
      const profileIngestion = yield* ProfileIngestionService;

      const buildAndPersist = (
        ref: Ref.Ref<DeepPartial<ResumeExtraction>>,
        name: string,
        recruiterId: RecruiterId
      ) =>
        Effect.gen(function* () {
          const extraction = (yield* Ref.get(ref)) as ResumeExtraction;

          const talent = new Talent({
            id: crypto.randomUUID() as TalentId,
            name,
            title: extraction.title,
            skills: [...extraction.skills],
            keywords: [],
            experienceYears: extraction.experienceYears,
            location: extraction.location,
            workModes: [...extraction.workModes],
            willingToRelocate: extraction.willingToRelocate,
            recruiterId,
            status: "reviewing",
            createdAt: new Date().toISOString(),
          });

          const enriched = yield* profileIngestion.enrich(talent);

          yield* talentRepo.create(
            new Talent({
              ...enriched.talent,
              keywords: [...enriched.keywords],
            }),
            [...enriched.embedding]
          );
        });

      return TalentOrchestrationService.of({
        createFromText: (params) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const ref = yield* Ref.make<DeepPartial<ResumeExtraction>>({});

              const extractionStream = llm
                .streamStructureResume(params.resumeText)
                .pipe(Stream.tap((partial) => Ref.set(ref, partial)));

              const persistPhase = Stream.fromEffect(
                buildAndPersist(ref, params.name, params.recruiterId)
              ).pipe(Stream.drain);

              return Stream.concat(extractionStream, persistPhase);
            })
          ),

        createFromPdf: (params) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const ref = yield* Ref.make<DeepPartial<ResumeExtraction>>({});

              const pdfBytes = Uint8Array.from(atob(params.pdfBase64), (c) =>
                c.charCodeAt(0)
              );

              const extractionStream = llm
                .streamStructureResumePdf(pdfBytes)
                .pipe(Stream.tap((partial) => Ref.set(ref, partial)));

              const persistPhase = Stream.fromEffect(
                buildAndPersist(ref, params.name, params.recruiterId)
              ).pipe(Stream.drain);

              return Stream.concat(extractionStream, persistPhase);
            })
          ),

        confirmSkills: (id, skills) =>
          Effect.gen(function* () {
            yield* talentRepo.updateSkills(id, skills);
            yield* talentRepo.updateStatus(id, "matched");
            return yield* talentRepo.findById(id);
          }),
      });
    })
  );
}
