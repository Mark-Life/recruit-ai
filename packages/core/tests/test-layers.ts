import { Effect, Layer, Stream } from "effect";
import {
  RecruiterNotFoundError,
  TalentNotFoundError,
} from "../src/domain/errors";
import type { StructuredJd } from "../src/domain/models/job-description";
import type { Recruiter } from "../src/domain/models/recruiter";
import { ResumeExtraction } from "../src/domain/models/resume-extraction";
import type { Talent } from "../src/domain/models/talent";
import { EmbeddingPort } from "../src/ports/embedding-port";
import { LlmPort } from "../src/ports/llm-port";
import { RecruiterRepository } from "../src/ports/recruiter-repository";
import { TalentRepository } from "../src/ports/talent-repository";
import type { VectorCandidate } from "../src/ports/vector-search-port";
import { VectorSearchPort } from "../src/ports/vector-search-port";
import { RankingService } from "../src/services/ranking-service";

const WHITESPACE_PATTERN = /\s+/;
// biome-ignore lint/style/noMagicNumbers: stub embedding vector for tests
const STUB_EMBEDDING = [0.1, 0.2, 0.3] as const;

/**
 * In-memory test stores. Populate these before running tests.
 * Mutable state is fine in tests — JS is single-threaded.
 */
export interface TestStores {
  readonly recruiters: Map<string, Recruiter>;
  /** LLM structureJd returns this for any input */
  structuredJd: StructuredJd;
  readonly talents: Map<string, Talent>;
  /** Vector search returns these candidates in order */
  vectorCandidates: readonly VectorCandidate[];
}

export function createTestStores(
  overrides: Partial<TestStores> = {}
): TestStores {
  return {
    talents: overrides.talents ?? new Map(),
    recruiters: overrides.recruiters ?? new Map(),
    structuredJd: overrides.structuredJd as StructuredJd,
    vectorCandidates: overrides.vectorCandidates ?? [],
  };
}

function makeLlmTestLayer(stores: TestStores) {
  return Layer.succeed(LlmPort, {
    structureJd: (_params: {
      readonly raw: string;
      readonly id: unknown;
      readonly organizationId: unknown;
    }) => Effect.succeed(stores.structuredJd),
    extractKeywords: (text: string) =>
      Effect.succeed(text.toLowerCase().split(WHITESPACE_PATTERN)),
    generateClarifyingQuestions: (_raw: string) => Effect.succeed([]),
    structureResume: (_text: string) =>
      Effect.succeed(
        ResumeExtraction.make({
          name: "Test Talent",
          title: "Engineer",
          skills: ["TypeScript"],
          keywords: ["engineering"],
          experienceYears: 5,
          location: "Unknown",
          workModes: ["remote"],
          willingToRelocate: false,
        })
      ),
    structureResumePdf: (_pdf: Uint8Array) =>
      Effect.succeed(
        ResumeExtraction.make({
          name: "Test Talent",
          title: "Engineer",
          skills: ["TypeScript"],
          keywords: ["engineering"],
          experienceYears: 5,
          location: "Unknown",
          workModes: ["remote"],
          willingToRelocate: false,
        })
      ),
    streamStructureJd: () => Stream.succeed({}),
    streamStructureResume: () => Stream.succeed({}),
    streamStructureResumePdf: () => Stream.succeed({}),
    streamClarifyingQuestions: () => Stream.succeed({ questions: [] }),
  });
}

function makeEmbeddingTestLayer() {
  return Layer.succeed(EmbeddingPort, {
    embed: (_text: string) => Effect.succeed([...STUB_EMBEDDING]),
  });
}

function makeVectorSearchTestLayer(stores: TestStores) {
  return Layer.succeed(VectorSearchPort, {
    search: (_vector, topK) =>
      Effect.succeed(stores.vectorCandidates.slice(0, topK)),
  });
}

function makeTalentRepositoryTestLayer(stores: TestStores) {
  return Layer.succeed(TalentRepository, {
    create: (talent) => {
      stores.talents.set(talent.id, talent);
      return Effect.succeed(talent);
    },
    findById: (id) =>
      Effect.fromNullable(stores.talents.get(id)).pipe(
        Effect.mapError(() => new TalentNotFoundError({ talentId: id }))
      ),
    findAll: () => Effect.succeed([...stores.talents.values()]),
    updateSkills: (id, skills) =>
      Effect.fromNullable(stores.talents.get(id)).pipe(
        Effect.mapError(() => new TalentNotFoundError({ talentId: id })),
        Effect.tap((talent) =>
          Effect.sync(() =>
            stores.talents.set(id, { ...talent, skills } as Talent)
          )
        ),
        Effect.asVoid
      ),
    updateStatus: (id, status) =>
      Effect.fromNullable(stores.talents.get(id)).pipe(
        Effect.mapError(() => new TalentNotFoundError({ talentId: id })),
        Effect.tap((talent) =>
          Effect.sync(() =>
            stores.talents.set(id, { ...talent, status } as Talent)
          )
        ),
        Effect.asVoid
      ),
    update: (id, data) =>
      Effect.fromNullable(stores.talents.get(id)).pipe(
        Effect.mapError(() => new TalentNotFoundError({ talentId: id })),
        Effect.map((talent) => {
          const updated = { ...talent, ...data } as Talent;
          stores.talents.set(id, updated);
          return updated;
        })
      ),
  });
}

function makeRecruiterRepositoryTestLayer(stores: TestStores) {
  return Layer.succeed(RecruiterRepository, {
    findById: (id) =>
      Effect.fromNullable(stores.recruiters.get(id)).pipe(
        Effect.mapError(() => new RecruiterNotFoundError({ recruiterId: id }))
      ),
    findByTalentIds: (talentIds) => {
      const talentIdSet = new Set(talentIds);
      const matching = [...stores.recruiters.values()].filter((r) =>
        r.talentIds.some((tid) => talentIdSet.has(tid))
      );
      return Effect.succeed(matching);
    },
  });
}

export function makeTestLayer(stores: TestStores) {
  return RankingService.layer.pipe(
    Layer.provideMerge(makeLlmTestLayer(stores)),
    Layer.provideMerge(makeEmbeddingTestLayer()),
    Layer.provideMerge(makeVectorSearchTestLayer(stores)),
    Layer.provideMerge(makeTalentRepositoryTestLayer(stores)),
    Layer.provideMerge(makeRecruiterRepositoryTestLayer(stores))
  );
}
