import { describe, expect, it } from "@effect/vitest";
import {
  JobDescriptionId,
  OrganizationId,
  RecruiterId,
  TalentId,
} from "@workspace/core/domain/models/ids";
import { Talent } from "@workspace/core/domain/models/talent";
import { scoreTalents } from "@workspace/core/domain/scoring";
import { EmbeddingPort } from "@workspace/core/ports/embedding-port";
import { LlmPort } from "@workspace/core/ports/llm-port";
import { Effect, Layer } from "effect";
import { GeminiEmbeddingLive, GeminiLlmLive } from "../src/layers";

// ---------------------------------------------------------------------------
// Fixtures — 1 JD + 3 resumes with predictable ranking order
// ---------------------------------------------------------------------------

const JD_TEXT = [
  "Senior Frontend Developer - Experienced. 5+ years.",
  "Skills: Advanced React, Angular, Vue.js, HTML, CSS, JavaScript (ES6+), Performance optimization, Lazy loading, Testing automation, Git, CI/CD.",
  "Responsibilities: Architect and implement frontend solutions. Lead performance optimization and cross-browser testing. Mentor junior developers.",
  "Keywords: Frontend, Enterprise Web Applications, Senior, React, UI, SPA/PWA.",
  "Location: San Francisco, CA. Work mode: hybrid. Full-time.",
].join("\n");

/** Best match — senior frontend dev with React/TypeScript */
const RESUME_A_TEXT = [
  "Name: Alice Chen.",
  "Senior Frontend Engineer. 6 years of experience.",
  "Skills: React, TypeScript, Next.js, Angular, Vue.js, HTML5, CSS3, JavaScript, Redux, Performance optimization, Webpack, Jest, Cypress, CI/CD, Git.",
  "Experience: Led frontend architecture at a SaaS company. Built enterprise-grade SPAs with React and TypeScript. Mentored junior developers. Implemented lazy loading and code splitting for performance.",
  "Location: San Francisco. Work mode: remote, hybrid.",
].join("\n");

/** Mid match — Senior backend dev, right seniority but wrong specialty */
const RESUME_B_TEXT = [
  "Name: Bob Martinez.",
  "Senior Backend Engineer. 7 years of experience.",
  "Skills: Node.js, TypeScript, PostgreSQL, Redis, Docker, Kubernetes, AWS, REST APIs, GraphQL, Microservices, CI/CD, Git.",
  "Experience: Designed and scaled backend microservices handling 50k requests per second. Led backend team of 5 engineers. Implemented event-driven architecture with Kafka.",
  "Location: Berlin. Work mode: remote, hybrid.",
].join("\n");

/** Worst match — Veterinarian, completely different domain */
const RESUME_C_TEXT = [
  "Name: Carol Davis.",
  "Veterinarian. 5 years of experience.",
  "Skills: Small animal surgery, radiology, pharmacology, anesthesia, emergency care, client communication, clinical diagnostics, laboratory analysis.",
  "Experience: Practiced small animal medicine at a multi-vet clinic. Performed surgical procedures and managed post-operative care. Mentored veterinary students during clinical rotations.",
  "Education: Doctor of Veterinary Medicine (DVM).",
  "Location: Austin, TX. Work mode: office.",
].join("\n");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------------------------------------------------------------------
// Test layer — combines LLM + Embedding from Gemini
// ---------------------------------------------------------------------------

const GeminiAiLive = Layer.merge(GeminiLlmLive, GeminiEmbeddingLive);

// ---------------------------------------------------------------------------
// Tests — require GOOGLE_GENERATIVE_AI_API_KEY, skip otherwise
// ---------------------------------------------------------------------------

const EVAL_TIMEOUT = 120_000;

describe.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)(
  "Ranking — full pipeline (structureJd + structureResume + embed + scoreTalents)",
  () => {
    it.effect(
      "ranks senior frontend above senior backend above veterinarian with full scoring",
      () =>
        Effect.gen(function* () {
          const llm = yield* LlmPort;
          const embedding = yield* EmbeddingPort;

          // Step 1: Structure the JD
          const structuredJd = yield* llm.structureJd({
            raw: JD_TEXT,
            id: JobDescriptionId.make("eval-jd-1"),
            organizationId: OrganizationId.make("eval-org-1"),
          });

          console.log("\n--- Structured JD ---");
          console.log("Role:", structuredJd.roleTitle);
          console.log("Skills:", structuredJd.skills.join(", "));
          console.log("Keywords:", structuredJd.keywords.join(", "));
          console.log("Seniority:", structuredJd.seniority);
          console.log("Work Mode:", structuredJd.workMode);
          console.log("Location:", structuredJd.location);
          console.log(
            `Experience: ${structuredJd.experienceYearsMin}-${structuredJd.experienceYearsMax} years`
          );

          // Step 2: Structure all resumes concurrently
          const [resumeA, resumeB, resumeC] = yield* Effect.all(
            [
              llm.structureResume(RESUME_A_TEXT),
              llm.structureResume(RESUME_B_TEXT),
              llm.structureResume(RESUME_C_TEXT),
            ],
            { concurrency: 3 }
          );

          console.log("\n--- Structured Resumes ---");
          for (const [label, r] of [
            ["A (frontend)", resumeA],
            ["B (backend)", resumeB],
            ["C (vet)", resumeC],
          ] as const) {
            console.log(
              `${label}: ${r.title} | ${r.experienceYears}y | skills: ${r.skills.join(", ")}`
            );
          }

          // Step 3: Build Talent objects with system IDs
          const recruiterId = RecruiterId.make("eval-rec-1");
          const talentEntries = [
            { id: "eval-t-1", resume: resumeA },
            { id: "eval-t-2", resume: resumeB },
            { id: "eval-t-3", resume: resumeC },
          ] as const;

          const talents = talentEntries.map(({ id, resume }) =>
            Talent.make({
              id: TalentId.make(id),
              name: resume.name,
              title: resume.title,
              skills: resume.skills as readonly string[],
              keywords: resume.keywords as readonly string[],
              experienceYears: resume.experienceYears,
              location: resume.location,
              workModes: resume.workModes as readonly (
                | "office"
                | "hybrid"
                | "remote"
              )[],
              willingToRelocate: resume.willingToRelocate,
              recruiterId,
            })
          );

          // Step 4: Embed JD summary + all resumes concurrently
          const [jdVec, vecA, vecB, vecC] = yield* Effect.all(
            [
              embedding.embed(structuredJd.summary),
              embedding.embed(RESUME_A_TEXT),
              embedding.embed(RESUME_B_TEXT),
              embedding.embed(RESUME_C_TEXT),
            ],
            { concurrency: 4 }
          );

          // Step 5: Compute cosine similarity → VectorCandidate[]
          const candidates = [
            {
              talentId: talents[0]!.id,
              similarity: cosineSimilarity(jdVec, vecA),
            },
            {
              talentId: talents[1]!.id,
              similarity: cosineSimilarity(jdVec, vecB),
            },
            {
              talentId: talents[2]!.id,
              similarity: cosineSimilarity(jdVec, vecC),
            },
          ];

          // Step 6: Run full scoring
          const results = scoreTalents(structuredJd, talents, candidates);

          // Step 7: Log results
          console.log("\n--- Full Ranking Results ---");
          console.table(
            results.map((r) => ({
              name: r.talent.name,
              title: r.talent.title,
              totalScore: r.totalScore.toFixed(4),
              semantic: r.breakdown.semanticSimilarity.toFixed(4),
              keywords: r.breakdown.keywordOverlap.toFixed(4),
              experience: r.breakdown.experienceFit.toFixed(4),
              constraints: r.breakdown.constraintFit.toFixed(4),
            }))
          );

          // Step 8: Assertions
          const [first, second, third] = results;

          // Ranking order: frontend > backend > veterinarian
          expect(first!.talent.id).toBe(TalentId.make("eval-t-1"));
          expect(third!.talent.id).toBe(TalentId.make("eval-t-3"));
          expect(first!.totalScore).toBeGreaterThan(second!.totalScore);
          expect(second!.totalScore).toBeGreaterThan(third!.totalScore);

          // Frontend dev should have meaningful keyword overlap
          expect(first!.breakdown.keywordOverlap).toBeGreaterThan(0);

          // Veterinarian should have near-zero keyword overlap
          const vetResult = results.find(
            (r) => r.talent.id === TalentId.make("eval-t-3")
          );
          expect(vetResult!.breakdown.keywordOverlap).toBe(0);

          // Meaningful spread between best and worst total scores
          expect(first!.totalScore - third!.totalScore).toBeGreaterThan(0.1);
        }).pipe(Effect.provide(GeminiAiLive)),
      { timeout: EVAL_TIMEOUT }
    );
  }
);
