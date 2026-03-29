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

type ExtractTalentError = LlmError | EmbeddingError | TalentNotFoundError;

export class TalentOrchestrationService extends Context.Tag(
  "@recruit/TalentOrchestrationService"
)<
  TalentOrchestrationService,
  {
    /** Insert a draft talent row with placeholder extraction fields. */
    readonly createDraft: (params: {
      readonly name: string;
      readonly resumeText?: string;
      readonly resumePdfBase64?: string;
      readonly recruiterId: RecruiterId;
    }) => Effect.Effect<Talent>;

    /** Load a draft talent by ID, stream LLM extraction, then persist enriched result. */
    readonly extractTalent: (
      id: TalentId
    ) => Stream.Stream<DeepPartial<ResumeExtraction>, ExtractTalentError>;

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

      /** Update the existing draft with extraction results and generate embedding. */
      const persistExtraction = (
        id: TalentId,
        ref: Ref.Ref<DeepPartial<ResumeExtraction>>,
        existing: Talent
      ) =>
        Effect.gen(function* () {
          const extraction = (yield* Ref.get(ref)) as ResumeExtraction;

          const updated = yield* talentRepo.update(id, {
            title: extraction.title,
            skills: [...extraction.skills],
            experienceYears: extraction.experienceYears,
            location: extraction.location,
            workModes: [...extraction.workModes],
            willingToRelocate: extraction.willingToRelocate,
            status: "reviewing",
          });

          const enriched = yield* profileIngestion.enrich(
            new Talent({ ...existing, ...updated })
          );

          yield* talentRepo.update(id, { keywords: [...enriched.keywords] }, [
            ...enriched.embedding,
          ]);
        });

      return TalentOrchestrationService.of({
        createDraft: (params) =>
          talentRepo.create(
            new Talent({
              id: crypto.randomUUID() as TalentId,
              name: params.name,
              title: "",
              skills: [],
              keywords: [],
              experienceYears: 0,
              location: "",
              workModes: [],
              willingToRelocate: false,
              resumeText: params.resumeText,
              resumePdfBase64: params.resumePdfBase64,
              recruiterId: params.recruiterId,
              status: "uploaded",
              createdAt: new Date().toISOString(),
            })
          ),

        extractTalent: (id) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const existing = yield* talentRepo.findById(id);
              const ref = yield* Ref.make<DeepPartial<ResumeExtraction>>({});

              const extractionStream = existing.resumePdfBase64
                ? llm
                    .streamStructureResumePdf(
                      Uint8Array.from(atob(existing.resumePdfBase64), (c) =>
                        c.charCodeAt(0)
                      )
                    )
                    .pipe(Stream.tap((partial) => Ref.set(ref, partial)))
                : llm
                    .streamStructureResume(existing.resumeText ?? "")
                    .pipe(Stream.tap((partial) => Ref.set(ref, partial)));

              const persistPhase = Stream.fromEffect(
                persistExtraction(id, ref, existing)
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
