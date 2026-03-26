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
  skills: ["react", "typescript", "next.js", "graphql"],
  keywords: ["frontend", "spa", "ui"],
  experienceYears: 7,
  location: "Berlin",
  workModes: ["office", "hybrid"],
  willingToRelocate: false,
  recruiterId: RecruiterId.make("rec-1"),
});

const juniorReactDev = Talent.make({
  id: TalentId.make("t-2"),
  name: "Junior React Dev",
  title: "Junior Frontend Developer",
  skills: ["react", "javascript", "css"],
  keywords: ["frontend", "web"],
  experienceYears: 2,
  location: "Berlin",
  workModes: ["office", "hybrid", "remote"],
  willingToRelocate: true,
  recruiterId: RecruiterId.make("rec-1"),
});

const backendEngineer = Talent.make({
  id: TalentId.make("t-3"),
  name: "Backend Engineer",
  title: "Backend Developer",
  skills: ["go", "postgresql", "kubernetes"],
  keywords: ["backend", "api", "microservices"],
  experienceYears: 5,
  location: "London",
  workModes: ["remote"],
  willingToRelocate: false,
  recruiterId: RecruiterId.make("rec-2"),
});

const reactJd = StructuredJd.make({
  id: JobDescriptionId.make("jd-1"),
  organizationId: OrganizationId.make("org-1"),
  rawText: "Looking for a senior React developer in Berlin",
  summary: "Senior React developer with TypeScript experience",
  roleTitle: "Senior Frontend Engineer",
  skills: ["react", "typescript", "next.js"],
  keywords: ["frontend", "spa"],
  seniority: "senior",
  employmentType: "full-time",
  workMode: "hybrid",
  location: "Berlin",
  willingToSponsorRelocation: false,
  experienceYearsMin: 4,
  experienceYearsMax: 8,
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
    const candidates: readonly VectorCandidate[] = [
      { talentId: TalentId.make("t-1"), similarity: 0.92 },
      { talentId: TalentId.make("t-3"), similarity: 0.45 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, backendEngineer],
      [recruiterAlice, recruiterBob],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalents(
        "any raw text",
        OrganizationId.make("org-1")
      );

      expect(matches).toHaveLength(2);
      expect(matches[0]!.talentId).toBe(TalentId.make("t-1"));
      expect(matches[1]!.talentId).toBe(TalentId.make("t-3"));
      expect(matches[0]!.totalScore).toBeGreaterThan(matches[1]!.totalScore);
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("keyword overlap boosts score", () => {
    // Both have same semantic similarity, but senior has better keyword match
    const candidates: readonly VectorCandidate[] = [
      { talentId: TalentId.make("t-1"), similarity: 0.7 },
      { talentId: TalentId.make("t-2"), similarity: 0.7 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, juniorReactDev],
      [recruiterAlice],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalents(
        "any raw text",
        OrganizationId.make("org-1")
      );

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
      { talentId: TalentId.make("t-1"), similarity: 0.7 },
      { talentId: TalentId.make("t-2"), similarity: 0.7 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, juniorReactDev],
      [recruiterAlice],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalents(
        "any raw text",
        OrganizationId.make("org-1")
      );

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

  it.effect("work mode mismatch reduces constraint score", () => {
    // JD wants hybrid, backend engineer only does remote
    const candidates: readonly VectorCandidate[] = [
      { talentId: TalentId.make("t-1"), similarity: 0.7 },
      { talentId: TalentId.make("t-3"), similarity: 0.7 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, backendEngineer],
      [recruiterAlice, recruiterBob],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalents(
        "any raw text",
        OrganizationId.make("org-1")
      );

      const seniorMatch = matches.find(
        (m) => m.talentId === TalentId.make("t-1")
      )!;
      const backendMatch = matches.find(
        (m) => m.talentId === TalentId.make("t-3")
      )!;

      // Senior supports hybrid (matches JD), backend only remote (no match)
      expect(seniorMatch.breakdown.constraintFit).toBeGreaterThan(
        backendMatch.breakdown.constraintFit
      );
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("remote JD gives full location score to all", () => {
    const remoteJd = StructuredJd.make({
      ...reactJd,
      id: JobDescriptionId.make("jd-remote"),
      workMode: "remote",
      location: "Worldwide",
    });
    const candidates: readonly VectorCandidate[] = [
      { talentId: TalentId.make("t-1"), similarity: 0.8 },
      { talentId: TalentId.make("t-3"), similarity: 0.8 },
    ];
    const stores = buildStores(
      remoteJd,
      [seniorReactDev, backendEngineer],
      [recruiterAlice, recruiterBob],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalents(
        "any raw text",
        OrganizationId.make("org-1")
      );

      // Backend supports remote → full constraint fit
      const backendMatch = matches.find(
        (m) => m.talentId === TalentId.make("t-3")
      )!;
      expect(backendMatch.breakdown.constraintFit).toBe(1);

      // Senior doesn't list remote in workModes → location passes (remote auto-pass)
      // but work mode check fails → 0.5 constraint fit
      const seniorMatch = matches.find(
        (m) => m.talentId === TalentId.make("t-1")
      )!;
      expect(seniorMatch.breakdown.constraintFit).toBe(0.5);
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("returns correct recruiter mapping", () => {
    const candidates: readonly VectorCandidate[] = [
      { talentId: TalentId.make("t-1"), similarity: 0.9 },
      { talentId: TalentId.make("t-3"), similarity: 0.5 },
    ];
    const stores = buildStores(
      reactJd,
      [seniorReactDev, backendEngineer],
      [recruiterAlice, recruiterBob],
      candidates
    );

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalents(
        "any raw text",
        OrganizationId.make("org-1")
      );

      const seniorMatch = matches.find(
        (m) => m.talentId === TalentId.make("t-1")
      )!;
      const backendMatch = matches.find(
        (m) => m.talentId === TalentId.make("t-3")
      )!;

      expect(seniorMatch.recruiterId).toBe(RecruiterId.make("rec-1"));
      expect(backendMatch.recruiterId).toBe(RecruiterId.make("rec-2"));
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });

  it.effect("returns empty results when no candidates", () => {
    const stores = buildStores(reactJd, [], [recruiterAlice], []);

    return Effect.gen(function* () {
      const ranking = yield* RankingService;
      const matches = yield* ranking.rankTalents(
        "any raw text",
        OrganizationId.make("org-1")
      );
      expect(matches).toHaveLength(0);
    }).pipe(Effect.provide(makeTestLayer(stores)));
  });
});
