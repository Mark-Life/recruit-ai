import { Context, Effect, Layer, Ref, Schema, Stream } from "effect";
import {
  type EmbeddingError,
  LlmError,
  type TalentNotFoundError,
  type VectorNotFoundError,
  type VectorSearchError,
} from "../domain/errors";
import type { RecruiterId } from "../domain/models/ids";
import { TalentId } from "../domain/models/ids";
import { ResumeExtraction } from "../domain/models/resume-extraction";
import { Talent, type UpdateTalentInput } from "../domain/models/talent";
import type { DeepPartial } from "../ports/llm-port";
import { LlmPort } from "../ports/llm-port";
import { TalentRepository } from "../ports/talent-repository";
import type { TalentPayload } from "../ports/vector-search-port";
import { VectorSearchPort } from "../ports/vector-search-port";
import { ProfileIngestionService } from "./profile-ingestion-service";

const TALENT_SEMANTIC_FIELDS = [
  "title",
  "keywords",
  "experienceYears",
  "location",
] as const;

const TALENT_PAYLOAD_KEYS = [
  "keywords",
  "experienceYears",
  "location",
  "workModes",
  "willingToRelocate",
] as const;

const extractTalentPayloadChanges = (
  data: UpdateTalentInput
): Partial<TalentPayload> => {
  const result: Record<string, unknown> = {};
  for (const key of TALENT_PAYLOAD_KEYS) {
    if (data[key] !== undefined) {
      const val = data[key];
      result[key] = Array.isArray(val) ? [...val] : val;
    }
  }
  return result as Partial<TalentPayload>;
};

/** Decode a DeepPartial<ResumeExtraction> into a validated ResumeExtraction, mapping ParseError to LlmError. */
const decodeResumeExtraction = (raw: DeepPartial<ResumeExtraction>) =>
  Schema.decodeUnknown(ResumeExtraction)(raw).pipe(
    Effect.mapError(
      (parseError) =>
        new LlmError({
          message: `LLM output failed ResumeExtraction validation: ${parseError.message}`,
        })
    )
  );

type ExtractTalentError =
  | LlmError
  | EmbeddingError
  | VectorSearchError
  | VectorNotFoundError
  | TalentNotFoundError;

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

    readonly confirmKeywords: (
      id: TalentId,
      keywords: readonly string[]
    ) => Effect.Effect<
      Talent,
      | TalentNotFoundError
      | EmbeddingError
      | VectorSearchError
      | VectorNotFoundError
    >;

    /** Update individual fields on a talent, re-embedding only when semantic fields change. */
    readonly updateTalent: (
      id: TalentId,
      data: UpdateTalentInput
    ) => Effect.Effect<
      Talent,
      TalentNotFoundError | EmbeddingError | VectorSearchError
    >;
  }
>() {
  static readonly layer = Layer.effect(
    TalentOrchestrationService,
    Effect.gen(function* () {
      const llm = yield* LlmPort;
      const talentRepo = yield* TalentRepository;
      const profileIngestion = yield* ProfileIngestionService;
      const vectorSearch = yield* VectorSearchPort;

      /** Update the existing draft with extraction results, embed, and upsert to Qdrant. */
      const persistExtraction = (
        id: TalentId,
        ref: Ref.Ref<DeepPartial<ResumeExtraction>>,
        existing: Talent
      ) =>
        Effect.gen(function* () {
          const extraction = yield* decodeResumeExtraction(yield* Ref.get(ref));

          const updated = yield* talentRepo.update(id, {
            title: extraction.title,
            keywords: [...extraction.keywords],
            experienceYears: extraction.experienceYears,
            location: extraction.location,
            workModes: [...extraction.workModes],
            willingToRelocate: extraction.willingToRelocate,
            status: "reviewing",
          });

          const enriched = yield* profileIngestion.enrich(
            new Talent({ ...existing, ...updated })
          );

          yield* vectorSearch.upsertTalent(id, enriched.embedding, {
            keywords: [...updated.keywords],
            workModes: [...updated.workModes],
            location: updated.location,
            experienceYears: updated.experienceYears,
            willingToRelocate: updated.willingToRelocate,
            status: "reviewing",
          });
        });

      return TalentOrchestrationService.of({
        createDraft: (params) =>
          talentRepo.create(
            new Talent({
              id: TalentId.make(crypto.randomUUID()),
              name: params.name,
              title: "",
              keywords: [],
              experienceYears: 0,
              location: "",
              workModes: [],
              willingToRelocate: false,
              resumeText: params.resumeText,
              resumePdfBase64: params.resumePdfBase64,
              recruiterId: params.recruiterId,
              status: "uploaded",
              createdAt: new Date(),
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

        confirmKeywords: (id, keywords) =>
          Effect.gen(function* () {
            yield* talentRepo.updateKeywords(id, keywords);
            yield* talentRepo.updateStatus(id, "matched");
            const talent = yield* talentRepo.findById(id);
            const enriched = yield* profileIngestion.enrich(talent);
            yield* vectorSearch.upsertTalent(id, enriched.embedding, {
              keywords: [...talent.keywords],
              workModes: [...talent.workModes],
              location: talent.location,
              experienceYears: talent.experienceYears,
              willingToRelocate: talent.willingToRelocate,
              status: "matched",
            });
            return talent;
          }),

        updateTalent: (id, data) =>
          Effect.gen(function* () {
            const updated = yield* talentRepo.update(id, data);
            const talent = new Talent({ ...updated });

            const needsReEmbed = TALENT_SEMANTIC_FIELDS.some(
              (k) => data[k] !== undefined
            );

            if (needsReEmbed) {
              const enriched = yield* profileIngestion.enrich(talent);
              yield* vectorSearch.upsertTalent(id, enriched.embedding, {
                keywords: [...talent.keywords],
                workModes: [...talent.workModes],
                location: talent.location,
                experienceYears: talent.experienceYears,
                willingToRelocate: talent.willingToRelocate,
                status: talent.status,
              });
            } else {
              const payloadChanges = extractTalentPayloadChanges(data);
              if (Object.keys(payloadChanges).length > 0) {
                yield* vectorSearch.updateTalentPayload(id, payloadChanges);
              }
            }

            return talent;
          }),
      });
    })
  );
}
