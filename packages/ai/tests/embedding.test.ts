import { describe, expect, it } from "@effect/vitest";
import { EmbeddingPort } from "@workspace/core/ports/embedding-port";
import { Effect } from "effect";
import { GeminiEmbeddingLive } from "../src/layers";

// ---------------------------------------------------------------------------
// Fixtures — 1 JD + 3 resumes with predictable ranking order
// ---------------------------------------------------------------------------

const JD_TEXT = [
  "Senior Frontend Developer - Experienced. 5+ years.",
  "Skills: Advanced React, Angular, Vue.js, HTML, CSS, JavaScript (ES6+), Performance optimization, Lazy loading, Testing automation, Git, CI/CD.",
  "Responsibilities: Architect and implement frontend solutions. Lead performance optimization and cross-browser testing. Mentor junior developers.",
  "Keywords: Frontend, Enterprise Web Applications, Senior, React, UI, SPA/PWA.",
].join("\n");

/** Best match — senior frontend dev with React/TypeScript */
const RESUME_A_TEXT = [
  "Senior Frontend Engineer. 6 years of experience.",
  "Skills: React, TypeScript, Next.js, Angular, Vue.js, HTML5, CSS3, JavaScript, Redux, Performance optimization, Webpack, Jest, Cypress, CI/CD, Git.",
  "Experience: Led frontend architecture at a SaaS company. Built enterprise-grade SPAs with React and TypeScript. Mentored junior developers. Implemented lazy loading and code splitting for performance.",
  "Location: San Francisco. Work mode: remote, hybrid.",
].join("\n");

/** Mid match — Senior backend dev, right seniority but wrong specialty */
const RESUME_B_TEXT = [
  "Senior Backend Engineer. 7 years of experience.",
  "Skills: Node.js, TypeScript, PostgreSQL, Redis, Docker, Kubernetes, AWS, REST APIs, GraphQL, Microservices, CI/CD, Git.",
  "Experience: Designed and scaled backend microservices handling 50k requests per second. Led backend team of 5 engineers. Implemented event-driven architecture with Kafka.",
  "Location: Berlin. Work mode: remote, hybrid.",
].join("\n");

/** Worst match — Veterinarian, completely different domain */
const RESUME_C_TEXT = [
  "Veterinarian. 5 years of experience.",
  "Skills: Small animal surgery, radiology, pharmacology, anesthesia, emergency care, client communication, clinical diagnostics, laboratory analysis.",
  "Experience: Practiced small animal medicine at a multi-vet clinic. Performed surgical procedures and managed post-operative care. Mentored veterinary students during clinical rotations.",
  "Education: Doctor of Veterinary Medicine (DVM).",
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
// Tests — require GOOGLE_GENERATIVE_AI_API_KEY, skip otherwise
// ---------------------------------------------------------------------------

const MINIMUM_SPREAD = 0.05;

describe.skipIf(!process.env.GOOGLE_GENERATIVE_AI_API_KEY)(
  "Embedding — similarity ranking",
  () => {
    it.effect(
      "ranks senior frontend above senior backend above veterinarian",
      () =>
        Effect.gen(function* () {
          const port = yield* EmbeddingPort;

          // Embed all 4 texts concurrently
          const [jdVec, vecA, vecB, vecC] = yield* Effect.all(
            [
              port.embed(JD_TEXT),
              port.embed(RESUME_A_TEXT),
              port.embed(RESUME_B_TEXT),
              port.embed(RESUME_C_TEXT),
            ],
            { concurrency: 4 }
          );

          const simA = cosineSimilarity(jdVec, vecA);
          const simB = cosineSimilarity(jdVec, vecB);
          const simC = cosineSimilarity(jdVec, vecC);

          console.table({
            "Resume A (senior frontend)": { similarity: simA.toFixed(4) },
            "Resume B (senior backend)": { similarity: simB.toFixed(4) },
            "Resume C (veterinarian)": { similarity: simC.toFixed(4) },
          });

          // Best match > mid match > worst match
          expect(simA).toBeGreaterThan(simB);
          expect(simB).toBeGreaterThan(simC);

          // Meaningful spread between best and worst
          expect(simA - simC).toBeGreaterThan(MINIMUM_SPREAD);
        }).pipe(Effect.provide(GeminiEmbeddingLive)),
      { timeout: 30_000 }
    );
  }
);
