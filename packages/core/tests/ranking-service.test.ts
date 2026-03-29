import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
  JobDescriptionId,
  OrganizationId,
  RecruiterId,
  TalentId,
} from "../src/domain/models/ids";
import { StructuredJd } from "../src/domain/models/job-description";
import { Recruiter } from "../src/domain/models/recruiter";
import { Talent } from "../src/domain/models/talent";
import type { VectorCandidate } from "../src/ports/vector-search-port";
import { RankingService } from "../src/services/ranking-service";
import { createTestStores, makeTestLayer } from "./test-layers";

// --- Fixtures ---

const recruiterAlice = Recruiter.make({
  id: RecruiterId.make("rec-1"),
  name: "Alice",
  email: "alice@agency.com",
  talentIds: [TalentId.make("t-1"), TalentId.make("t-2")],
});

const recruiterBob = Recruiter.make({
  id: RecruiterId.make("rec-2"),
  name: "Bob",
  email: "bob@agency.com",
  talentIds: [TalentId.make("t-3")],
});

const seniorReactDev = Talent.make({
  id: TalentId.make("t-1"),
  name: "Senior React Dev",
  title: "Senior Frontend Engineer",
  keywords: [
    "react",
    "typescript",
    "next.js",
    "graphql",
    "frontend",
    "spa",
    "ui",
  ],
  experienceYears: 7,
  location: "Berlin",
  workModes: ["office", "hybrid"],
  willingToRelocate: false,
  recruiterId: RecruiterId.make("rec-1"),
  status: "reviewing",
  createdAt: "2026-01-01T00:00:00.000Z",
});

const juniorReactDev = Talent.make({
  id: TalentId.make("t-2"),
  name: "Junior React Dev",
  title: "Junior Frontend Developer",
  keywords: ["react", "javascript", "css", "frontend", "web"],
  experienceYears: 2,
  location: "Berlin",
  workModes: ["office", "hybrid", "remote"],
  willingToRelocate: true,
  recruiterId: RecruiterId.make("rec-1"),
  status: "reviewing",
  createdAt: "2026-01-01T00:00:00.000Z",
});

const backendEngineer = Talent.make({
  id: TalentId.make("t-3"),
  name: "Backend Engineer",
  title: "Backend Developer",
  keywords: [
    "go",
    "postgresql",
    "kubernetes",
    "backend",
    "api",
    "microservices",
  ],
  experienceYears: 5,
  location: "London",
  workModes: ["remote"],
  willingToRelocate: false,
  recruiterId: RecruiterId.make("rec-2"),
  status: "reviewing",
  createdAt: "2026-01-01T00:00:00.000Z",
});

const reactJd = StructuredJd.make({
  id: JobDescriptionId.make("jd-1"),
  organizationId: OrganizationId.make("org-1"),
  rawText: "Looking for a senior React developer in Berlin",
  summary: "Senior React developer with TypeScript experience",
  roleTitle: "Senior Frontend Engineer",
  keywords: ["react", "typescript", "next.js", "frontend", "spa"],
  seniority: "senior",
  employmentType: "full-time",
  workMode: "hybrid",
  location: "Berlin",
  willingToSponsorRelocation: false,
  experienceYearsMin: 4,
  experienceYearsMax: 8,
  status: "ready",
  createdAt: "2026-01-01T00:00:00.000Z",
});

function buildStores(
  jd: StructuredJd,
  talents: readonly Talent[],
  recruiters: readonly Recruiter[],
  candidates: readonly VectorCandidate[]
) {
  const talentMap = new Map(talents.map((t) => [t.id as string, t]));
  const recruiterMap = new Map(recruiters.map((r) => [r.id as string, r]));
  return createTestStores({
    structuredJd: jd,
    talents: talentMap,
    recruiters: recruiterMap,
    vectorCandidates: candidates,
  });
}

// --- Tests ---

describe("RankingService.rankTalents", () => {
  it.effect("ranks matching talent above non-matching", () => {
    // Both talents support hybrid (JD work mode) and are in Berlin (JD location)
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-1"), similarity: 0.92 },
      { id: TalentId.make("t-2"), similarity: 0.45 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, juniorReactDev],
      [recruiterAlice],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      expect(matches).toHaveLength(2);
      expect(matches[0]!.talentId).toBe(TalentId.make("t-1"));
      expect(matches[1]!.talentId).toBe(TalentId.make("t-2"));
      expect(matches[0]!.totalScore).toBeGreaterThan(matches[1]!.totalScore);
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("keyword overlap boosts score", () => {
    // Both have same semantic similarity, but senior has better keyword match
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-1"), similarity: 0.7 },
      { id: TalentId.make("t-2"), similarity: 0.7 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, juniorReactDev],
      [recruiterAlice],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      expect(matches).toHaveLength(2);
      // Senior has react + typescript + next.js overlap vs JD's react + typescript + next.js
      // Junior only has react
      expect(matches[0]!.breakdown.keywordOverlap).toBeGreaterThan(
        matches[1]!.breakdown.keywordOverlap
      );
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("experience outside range penalizes score", () => {
    // JD wants 4-8 years. Junior has 2 (below), senior has 7 (within range)
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-1"), similarity: 0.7 },
      { id: TalentId.make("t-2"), similarity: 0.7 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, juniorReactDev],
      [recruiterAlice],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      const seniorMatch = matches.find(
        (m) => m.talentId === TalentId.make("t-1")
      )!;
      const juniorMatch = matches.find(
        (m) => m.talentId === TalentId.make("t-2")
      )!;

      expect(seniorMatch.breakdown.experienceFit).toBe(1);
      expect(juniorMatch.breakdown.experienceFit).toBeLessThan(1);
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("work mode mismatch excludes talent via hard constraint", () => {
    // JD wants hybrid, backend engineer only does remote → excluded entirely
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-1"), similarity: 0.7 },
      { id: TalentId.make("t-3"), similarity: 0.7 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, backendEngineer],
      [recruiterAlice, recruiterBob],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      // Backend engineer excluded — only senior remains
      expect(matches).toHaveLength(1);
      expect(matches[0]!.talentId).toBe(TalentId.make("t-1"));
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("remote JD excludes talent that does not support remote", () => {
    const remoteJd = StructuredJd.make({
      ...reactJd,
      id: JobDescriptionId.make("jd-remote"),
      workMode: "remote",
      location: "Worldwide",
    });
    // Senior only does office/hybrid, backend does remote
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-1"), similarity: 0.8 },
      { id: TalentId.make("t-3"), similarity: 0.8 },
    ];
    const stores = buildStores(
      remoteJd,
      [seniorReactDev, backendEngineer],
      [recruiterAlice, recruiterBob],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      // Senior doesn't support remote → excluded by hard constraint
      expect(matches).toHaveLength(1);
      expect(matches[0]!.talentId).toBe(TalentId.make("t-3"));
      // Backend supports remote → full constraint fit
      expect(matches[0]!.breakdown.constraintFit).toBe(1);
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("returns correct recruiter mapping", () => {
    // Both talents pass hard constraints (hybrid + Berlin)
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-1"), similarity: 0.9 },
      { id: TalentId.make("t-2"), similarity: 0.5 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, juniorReactDev],
      [recruiterAlice],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      // Both covered by recruiter Alice (rec-1)
      expect(matches[0]!.recruiterId).toBe(RecruiterId.make("rec-1"));
      expect(matches[1]!.recruiterId).toBe(RecruiterId.make("rec-1"));
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("returns empty results when no candidates", () => {
    const stores = buildStores(reactJd, [], [recruiterAlice], []);

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);
      expect(matches).toHaveLength(0);
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  // --- Hard constraint filtering ---

  it.effect("excludes talent with incompatible work mode", () => {
    // JD wants hybrid, backend engineer only does remote → excluded
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-1"), similarity: 0.9 },
      { id: TalentId.make("t-3"), similarity: 0.9 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, backendEngineer],
      [recruiterAlice, recruiterBob],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      expect(matches).toHaveLength(1);
      expect(matches[0]!.talentId).toBe(TalentId.make("t-1"));
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("excludes talent in wrong location without relocation", () => {
    // JD is Berlin office, talent is in London and won't relocate → excluded
    const officeJd = StructuredJd.make({
      ...reactJd,
      id: JobDescriptionId.make("jd-office"),
      workMode: "office",
      willingToSponsorRelocation: false,
    });
    const londonTalent = Talent.make({
      ...seniorReactDev,
      id: TalentId.make("t-london"),
      location: "London",
      workModes: ["office", "hybrid"],
      willingToRelocate: false,
      recruiterId: RecruiterId.make("rec-1"),
    });
    const berlinTalent = Talent.make({
      ...seniorReactDev,
      id: TalentId.make("t-berlin"),
      location: "Berlin",
      workModes: ["office", "hybrid"],
      recruiterId: RecruiterId.make("rec-1"),
    });
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-london"), similarity: 0.95 },
      { id: TalentId.make("t-berlin"), similarity: 0.8 },
    ];
    const stores = buildStores(
      officeJd,
      [londonTalent, berlinTalent],
      [recruiterAlice],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      expect(matches).toHaveLength(1);
      expect(matches[0]!.talentId).toBe(TalentId.make("t-berlin"));
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("keeps talent in wrong location when relocation is viable", () => {
    const officeJd = StructuredJd.make({
      ...reactJd,
      id: JobDescriptionId.make("jd-reloc"),
      workMode: "office",
      willingToSponsorRelocation: true,
    });
    const londonTalent = Talent.make({
      ...seniorReactDev,
      id: TalentId.make("t-london-reloc"),
      location: "London",
      workModes: ["office", "hybrid"],
      willingToRelocate: true,
      recruiterId: RecruiterId.make("rec-1"),
    });
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-london-reloc"), similarity: 0.9 },
    ];
    const stores = buildStores(
      officeJd,
      [londonTalent],
      [recruiterAlice],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      expect(matches).toHaveLength(1);
      expect(matches[0]!.talentId).toBe(TalentId.make("t-london-reloc"));
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("skips location filtering for remote JDs", () => {
    const remoteJd = StructuredJd.make({
      ...reactJd,
      id: JobDescriptionId.make("jd-remote-filter"),
      workMode: "remote",
      location: "Worldwide",
    });
    // Backend engineer is remote-only and in London — should pass for remote JD
    const candidates: readonly VectorCandidate[] = [
      { id: TalentId.make("t-3"), similarity: 0.8 },
    ];
    const stores = buildStores(
      remoteJd,
      [backendEngineer],
      [recruiterBob],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalentsByJob(reactJd.id);

      expect(matches).toHaveLength(1);
      expect(matches[0]!.talentId).toBe(TalentId.make("t-3"));
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });
});
