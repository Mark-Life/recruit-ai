import { Effect, Layer, Stream } from "effect";
import {
  JobDescriptionNotFoundError,
  RecruiterNotFoundError,
  TalentNotFoundError,
} from "../src/domain/errors";
import type { StructuredJd } from "../src/domain/models/job-description";
import type { Recruiter } from "../src/domain/models/recruiter";
import { ResumeExtraction } from "../src/domain/models/resume-extraction";
import type { Talent } from "../src/domain/models/talent";
import { EmbeddingPort } from "../src/ports/embedding-port";
import { JobDescriptionRepository } from "../src/ports/job-description-repository";
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
  /** JD used for ranking tests */
  structuredJd: StructuredJd;
  readonly talents: Map<string, Talent>;
  /** Vector search returns these candidates in order */
  vectorCandidates: readonly VectorCandidate[];
}

export const createTestStores = (
  overrides: Partial<TestStores> = {}
): TestStores => {
  return {
    talents: overrides.talents ?? new Map(),
    recruiters: overrides.recruiters ?? new Map(),
    structuredJd: overrides.structuredJd as StructuredJd,
    vectorCandidates: overrides.vectorCandidates ?? [],
  };
};

const makeLlmTestLayer = (stores: TestStores) => {
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
          keywords: ["TypeScript", "engineering"],
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
          keywords: ["TypeScript", "engineering"],
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
};

const makeEmbeddingTestLayer = () => {
  return Layer.succeed(EmbeddingPort, {
    embed: (_text: string) => Effect.succeed([...STUB_EMBEDDING]),
  });
};

const makeVectorSearchTestLayer = (stores: TestStores) => {
  return Layer.succeed(VectorSearchPort, {
    upsertTalent: () => Effect.void,
    upsertJob: () => Effect.void,
    searchTalentsByJobId: (_jobId, topK, filter) => {
      const filtered = stores.vectorCandidates.filter((c) => {
        const talent = stores.talents.get(c.id);
        if (!talent) {
          return false;
        }
        if (
          filter?.workModes?.length &&
          !filter.workModes.some((wm) =>
            talent.workModes.includes(wm as "office" | "hybrid" | "remote")
          )
        ) {
          return false;
        }
        if (filter?.location) {
          const locMatch =
            talent.location
              .toLowerCase()
              .includes(filter.location.toLowerCase()) ||
            filter.location
              .toLowerCase()
              .includes(talent.location.toLowerCase());
          if (
            !(
              locMatch ||
              (filter.willingToRelocate && talent.willingToRelocate)
            )
          ) {
            return false;
          }
        }
        return true;
      });
      return Effect.succeed(filtered.slice(0, topK));
    },
    searchJobsByTalentId: (_talentId, topK) =>
      Effect.succeed(stores.vectorCandidates.slice(0, topK)),
    deleteTalent: () => Effect.void,
    deleteJob: () => Effect.void,
  });
};

const makeJobDescriptionRepositoryTestLayer = (stores: TestStores) => {
  return Layer.succeed(JobDescriptionRepository, {
    create: (jd) => Effect.succeed(jd),
    findById: (_id) =>
      stores.structuredJd
        ? Effect.succeed(stores.structuredJd)
        : Effect.fail(
            new JobDescriptionNotFoundError({ jobDescriptionId: _id })
          ),
    findByIds: () =>
      Effect.succeed(stores.structuredJd ? [stores.structuredJd] : []),
    findAll: () =>
      Effect.succeed(stores.structuredJd ? [stores.structuredJd] : []),
    updateStatus: () => Effect.void,
    update: (_id, data) =>
      Effect.succeed({ ...stores.structuredJd, ...data } as StructuredJd),
  });
};

const makeTalentRepositoryTestLayer = (stores: TestStores) => {
  return Layer.succeed(TalentRepository, {
    create: (talent) => {
      stores.talents.set(talent.id, talent);
      return Effect.succeed(talent);
    },
    findById: (id) =>
      Effect.fromNullable(stores.talents.get(id)).pipe(
        Effect.mapError(() => new TalentNotFoundError({ talentId: id }))
      ),
    findByIds: (ids) =>
      Effect.succeed(
        ids
          .map((id) => stores.talents.get(id))
          .filter((t): t is Talent => t !== undefined)
      ),
    findAll: () => Effect.succeed([...stores.talents.values()]),
    updateKeywords: (id, keywords) =>
      Effect.fromNullable(stores.talents.get(id)).pipe(
        Effect.mapError(() => new TalentNotFoundError({ talentId: id })),
        Effect.tap((talent) =>
          Effect.sync(() =>
            stores.talents.set(id, { ...talent, keywords } as Talent)
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
};

const makeRecruiterRepositoryTestLayer = (stores: TestStores) => {
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
};

export const makeTestLayer = (stores: TestStores) => {
  return RankingService.layer.pipe(
    Layer.provideMerge(makeVectorSearchTestLayer(stores)),
    Layer.provideMerge(makeJobDescriptionRepositoryTestLayer(stores)),
    Layer.provideMerge(makeTalentRepositoryTestLayer(stores)),
    Layer.provideMerge(makeRecruiterRepositoryTestLayer(stores)),
    Layer.provideMerge(makeLlmTestLayer(stores)),
    Layer.provideMerge(makeEmbeddingTestLayer())
  );
};
