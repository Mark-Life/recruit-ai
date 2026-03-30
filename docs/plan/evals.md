# Evaluation Plan

Goal: systematically measure and improve each component of the matching pipeline using internal datasets. Each eval group defines what we test, how datasets look, grading methods, and key metrics.

Framework follows [Anthropic's eval methodology](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents): task (single test case), trial (one attempt, multiple per task for non-determinism), grader (scoring logic), and clear separation between capability evals (what can we improve?) and regression evals (did we break something?).

---

## Dataset Foundation

Before any eval runs, we need labeled ground-truth data from internal records.

### Source: internal recruiter data


| Dataset         | Source                                                              | Min size | Fields needed                                                                                     |
| --------------- | ------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| Labeled JDs     | Historical job descriptions + recruiter-validated structured fields | 200+     | Raw text + correct extraction (title, keywords, seniority, experience range, work mode, location) |
| Labeled resumes | Candidate resumes + recruiter-validated profiles                    | 200+     | Raw text/PDF + correct extraction (name, title, keywords, experience years, location, work modes) |
| Known matches   | Historical successful placements (talent placed in job)             | 100+     | (talent_id, job_id, quality: good/great/poor) — recruiter-labeled                                 |
| Near-misses     | Candidates considered but rejected, with rejection reason           | 50+      | (talent_id, job_id, rejection_reason)                                                             |
| Clarifying Q&A  | Recruiter-written clarifications on ambiguous JDs                   | 50+      | Raw JD + recruiter questions + answers                                                            |


### Dataset splits

- **Dev set** (60%): iterate on prompts, weights, models
- **Held-out test set** (40%): final comparison only, never tune against this
- Stratify by: seniority level, work mode, industry/domain, location diversity

---

## Group 1: LLM Extraction Evals

What: measure accuracy of structured field extraction from raw text.

Three sub-evals sharing similar methodology:

### 1a. Job Description Extraction

**Task**: given raw JD text, extract structured fields (roleTitle, keywords, seniority, experienceMin/Max, workMode, location, willingToSponsorRelocation).

**Dataset format**:

```jsonc
{
  "id": "jd-eval-042",
  "input": "We are looking for a Senior Backend Engineer with 5-8 years...",
  "expected": {
    "roleTitle": "Senior Backend Engineer",
    "keywords": ["Go", "PostgreSQL", "Kubernetes", "gRPC"],
    "seniority": "senior",
    "experienceYearsMin": 5,
    "experienceYearsMax": 8,
    "workMode": "hybrid",
    "location": "Berlin",
    "willingToSponsorRelocation": true
  }
}
```

**Graders** (multiple per task):


| Grader                        | Type | What it measures                                                                          | Score                |
| ----------------------------- | ---- | ----------------------------------------------------------------------------------------- | -------------------- |
| Exact match: seniority        | Code | Enum field correctness                                                                    | Binary 0/1           |
| Exact match: workMode         | Code | Enum field correctness                                                                    | Binary 0/1           |
| Exact match: experience range | Code | ±1 year tolerance on min/max                                                              | Binary 0/1           |
| Keyword recall                | Code | `                                                                                         | extracted ∩ expected |
| Keyword precision             | Code | `                                                                                         | extracted ∩ expected |
| Keyword F1                    | Code | Harmonic mean of recall + precision                                                       | 0.0–1.0              |
| Location match                | Code | Normalized string match (case-insensitive, trim)                                          | Binary 0/1           |
| Overall extraction quality    | LLM  | Rubric: "Given the raw JD and expected output, rate extraction completeness and accuracy" | Likert 1–5           |


**Metrics**: field-level accuracy (per field), keyword F1, composite score (weighted average across fields). Run 3 trials per task to measure consistency (pass^3).

**What to compare**:

- Prompt variations (more/fewer examples, different instructions)
- Temperature (0.0 vs 0.3)
- Models — across providers and sizes:


| Model                      | Provider                   | Notes                                                |
| -------------------------- | -------------------------- | ---------------------------------------------------- |
| Gemini 2.0 Flash (current) | Google                     | Current baseline, fast, cheap                        |
| GPT-4o-mini                | OpenAI                     | Mature structured output, function calling           |
| Claude Haiku 4.5           | Anthropic                  | Strong reasoning for ambiguous inputs                |
| GPT-o3-mini                | OpenAI                     | Reasoning model, may help with ambiguous extractions |
| Llama 3.1 8B Instruct      | Meta (via Groq/OpenRouter) | Smallest viable open-source, very fast on Groq       |
| Llama 3.3 70B Versatile    | Meta (via Groq/OpenRouter) | Strong open-source, good structured output           |
| Llama 4 Scout 17B 16E      | Meta                       | MoE architecture, good cost/quality ratio            |
| Qwen3 32B                  | Alibaba (via OpenRouter)   | Strong multilingual, competitive benchmarks          |
| Kimi K2                    | Moonshot AI                | MoE, strong coding/reasoning                         |
| GPT-oss-20B                | OpenAI                     | Open-source, good baseline for self-hosting          |
| GPT-oss-120B               | OpenAI                     | Open-source, near-frontier quality                   |


Open-source models are interesting for: cost reduction at scale, self-hosting for data privacy (recruiter data is sensitive), and eliminating vendor lock-in. Trade-off is hosting complexity and potentially lower structured output reliability.

### 1b. Resume Extraction

Same methodology as 1a. Fields: name, title, keywords, experienceYears, location, workModes, willingToRelocate.

**Additional graders**:


| Grader                    | Type | What it measures                 |
| ------------------------- | ---- | -------------------------------- |
| Experience years accuracy | Code | `abs(extracted - expected) <= 1` |
| Work modes set match      | Code | Exact set equality               |


**Edge cases to include in dataset**: career changers (multiple domains), gaps in employment, freelancers with no single title, non-English resumes, PDFs with complex formatting.

### 1c. Clarifying Questions Generation

**Task**: given an ambiguous JD, generate useful clarifying questions.

**Dataset format**:

```jsonc
{
  "id": "q-eval-007",
  "input": "Looking for a developer, competitive salary, great team...",
  "expected_question_topics": ["seniority", "workMode", "location", "tech_stack", "experience"],
  "human_quality_label": "good"  // recruiter-rated
}
```

**Graders**:


| Grader           | Type | What it measures                                                              |
| ---------------- | ---- | ----------------------------------------------------------------------------- |
| Topic coverage   | Code | How many expected topics are addressed by generated questions                 |
| Redundancy check | Code | No duplicate questions targeting same field                                   |
| Question quality | LLM  | Rubric: relevance, clarity, would a recruiter find this useful? Likert 1–5    |
| Actionability    | LLM  | "Would answering these questions meaningfully improve the extraction?" Binary |


**Key metric**: topic coverage + LLM quality score. Questions are generative — grade outcomes (do they cover gaps?) not paths (exact wording).

---

## Group 2: Embedding Evals

What: measure which embedding model produces vectors that best separate good matches from bad matches.

### 2a. Embedding Model Comparison

**Task**: given a JD and a set of labeled talents (good match, poor match), does the embedding model rank good matches higher by cosine similarity?

**Dataset format**:

```jsonc
{
  "id": "emb-eval-015",
  "job": { "text": "...", "structured": { ... } },
  "positives": ["talent-id-1", "talent-id-4"],   // known good matches
  "negatives": ["talent-id-7", "talent-id-12"],   // known poor matches
  "hard_negatives": ["talent-id-9"]               // similar domain but wrong fit
}
```

**Graders** (all code-based, deterministic):


| Metric                     | What it measures                                                              |
| -------------------------- | ----------------------------------------------------------------------------- |
| Recall@10                  | Of known good matches, how many appear in top 10 by cosine similarity?        |
| Recall@50                  | Same at top 50 (our retrieval budget)                                         |
| MRR (Mean Reciprocal Rank) | Average 1/rank of first relevant result                                       |
| Separation gap             | Mean cosine(positive) - mean cosine(negative). Bigger = better discrimination |
| Hard negative rejection    | Are hard negatives ranked below positives?                                    |


**What to compare**:

**Proprietary models**:


| Model                         | Provider | Dimensions | Notes                                               |
| ----------------------------- | -------- | ---------- | --------------------------------------------------- |
| Gemini embedding (current)    | Google   | 3072       | Current baseline                                    |
| OpenAI text-embedding-3-large | OpenAI   | 3072       | Strong benchmark performer, adjustable dims         |
| OpenAI text-embedding-3-small | OpenAI   | 1536       | Cost/speed tradeoff                                 |
| Cohere embed-v3               | Cohere   | 1024       | Search-optimized, separate query vs doc input types |
| Voyage AI voyage-3            | Voyage   | 1024       | Code/technical content specialist                   |


**Open-source models**:


| Model                 | Provider   | Dimensions | Notes                                                                                                                                                  |
| --------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pplx-embed-v1         | Perplexity | —          | Built for web-scale retrieval, [details](https://research.perplexity.ai/articles/pplx-embed-state-of-the-art-embedding-models-for-web-scale-retrieval) |
| pplx-embed-context-v1 | Perplexity | —          | Context-aware variant of pplx-embed                                                                                                                    |
| E5-large-v2           | Microsoft  | 1024       | Strong open-source baseline, self-hostable                                                                                                             |
| BGE-large-en-v1.5     | BAAI       | 1024       | Top MTEB performer, self-hostable                                                                                                                      |
| GTE-large             | Alibaba    | 1024       | Competitive with proprietary on MTEB                                                                                                                   |
| Nomic Embed Text v1.5 | Nomic      | 768        | Open-source, Matryoshka (adjustable dims)                                                                                                              |
| Jina Embeddings v3    | Jina AI    | 1024       | Multilingual, task-specific LoRA adapters                                                                                                              |


Full catalog of available embedding models: [OpenRouter embedding models](https://openrouter.ai/models?fmt=cards&output_modalities=embeddings)

Open-source embedding models enable: self-hosting for data privacy (resume/JD data is sensitive), no per-request API cost at scale, and full control over versioning. Trade-off is GPU infrastructure and potentially lower quality than frontier proprietary models — which is exactly what this eval measures.

**Important**: embed all models against same dataset, same text preparation. Vary text preparation as separate experiment (raw resume vs structured profile text).

### 2b. Text Preparation for Embedding

**Task**: does the text we feed to the embedding model matter?

**Variants to test** (same model, different input text):


| Variant              | Input                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Structured (current) | `"Senior Frontend Engineer. Keywords: React, TypeScript. Experience: 7 years. Location: Berlin"` |
| Raw resume text      | Full resume text, no processing                                                                  |
| Summary only         | LLM-generated 2-sentence summary                                                                 |
| Keywords only        | Just the keyword list                                                                            |
| Title + keywords     | Title and keywords, no experience/location                                                       |


**Grader**: same retrieval metrics as 2a. Whichever text prep yields highest Recall@50 and MRR wins.

---

## Group 3: Retrieval Evals (Vector DB)

What: measure end-to-end retrieval quality including filtering.

### 3a. Retrieval Quality with Filters

**Task**: given a JD with hard constraints, does the retrieval pipeline return eligible, relevant candidates?

**Dataset format**:

```jsonc
{
  "id": "ret-eval-003",
  "job": { ... },  // with workMode, location, etc.
  "expected_eligible": ["t-1", "t-4", "t-7"],      // pass constraints + relevant
  "expected_ineligible": ["t-2", "t-5"],             // fail constraints
  "expected_irrelevant": ["t-3", "t-6"]              // pass constraints but wrong domain
}
```

**Graders**:


| Metric             | What it measures                                    |
| ------------------ | --------------------------------------------------- |
| Filter correctness | Zero ineligible candidates in results               |
| Eligible recall@50 | What fraction of eligible candidates are retrieved? |
| Precision@10       | Of top 10 returned, how many are truly relevant?    |


**What to compare**:

- Qdrant (current) vs pgvector (post-filter) vs Vespa (hybrid)
- Measure: filter correctness, recall@50, latency (p50, p95)
- Key hypothesis: Qdrant pre-filtering > pgvector post-filtering when constraints eliminate >50% of candidates

### 3b. Retrieval Latency Benchmarks

Not an accuracy eval — a performance eval. Measure across dataset sizes.


| Metric      | Target           |
| ----------- | ---------------- |
| p50 latency | <50ms            |
| p95 latency | <200ms           |
| Throughput  | >100 queries/sec |


Test at: 1K, 10K, 50K, 100K vectors. Compare Qdrant vs pgvector vs Vespa at each scale.

---

## Group 4: Scoring Formula Evals

What: optimize the 4-factor scoring weights and validate the formula against recruiter judgment.

### 4a. Weight Optimization

**Task**: given known match quality labels from recruiters, find weights that best predict recruiter preferences.

**Dataset format**:

```jsonc
{
  "job_id": "jd-42",
  "talent_id": "t-15",
  "factor_scores": {
    "semanticSimilarity": 0.82,
    "keywordOverlap": 0.65,
    "experienceFit": 1.0,
    "constraintFit": 1.0
  },
  "recruiter_label": "great_match",     // great_match | good_match | weak_match | no_match
  "recruiter_rank": 2                    // out of N candidates for this job
}
```

**Method**:

1. Compute factor scores for all (job, talent) pairs in labeled dataset
2. Grid search or Bayesian optimization over weight combinations
3. Objective: maximize rank correlation (Kendall's tau or Spearman's rho) between predicted ranking and recruiter ranking

**Current weights** (baseline):

```
semantic: 0.4, keyword: 0.25, experience: 0.2, constraint: 0.15
```

**Search space**:

```
semantic:   [0.2, 0.6]
keyword:    [0.1, 0.4]
experience: [0.05, 0.3]
constraint: [0.05, 0.3]
sum = 1.0
```

**Graders**:


| Metric          | What it measures                                                       |
| --------------- | ---------------------------------------------------------------------- |
| Kendall's tau   | Rank correlation with recruiter ordering                               |
| NDCG@10         | Normalized discounted cumulative gain — do great matches rank highest? |
| Top-1 accuracy  | Does the #1 predicted match equal the recruiter's #1?                  |
| Label agreement | Map score to label (thresholds), measure accuracy vs recruiter labels  |


### 4b. Factor Contribution Analysis

**Task**: how much does each factor actually help?

**Method**: ablation study — remove one factor at a time, measure NDCG@10 drop.


| Experiment            | Config                             |
| --------------------- | ---------------------------------- |
| Full model (baseline) | All 4 factors                      |
| No semantic           | keyword + experience + constraint  |
| No keyword            | semantic + experience + constraint |
| No experience         | semantic + keyword + constraint    |
| No constraint         | semantic + keyword + experience    |
| Semantic only         | semantic similarity alone          |


If removing a factor barely hurts NDCG, it's not pulling weight. If semantic-only is nearly as good as full model, the other factors may need rethinking.

### 4c. Agent-Driven Formula Discovery

Beyond manual grid search — use an agentic coding loop to automatically discover the optimal scoring formula.

**Idea**: given a human-labeled dataset (recruiter rankings as ground truth), an agent (Claude Code, Cursor, or a custom agent loop) can iteratively modify `scoring.ts`, run the eval suite, observe NDCG@10 / Kendall's tau, and try again until the target metric is met.

**How it works**:

```
┌─────────────────────────────────────┐
│  Human-labeled dataset              │
│  (recruiter rankings = target)      │
└──────────────┬──────────────────────┘
               │
┌──────────────v──────────────────────┐
│  Agent loop                         │
│                                     │
│  1. Read current scoring.ts         │
│  2. Run eval: `bun vitest evals/`   │
│  3. Observe NDCG@10, Kendall's tau  │
│  4. Analyze: which cases fail?      │
│  5. Hypothesize: change weights,    │
│     add/remove factors, change      │
│     decay curves, add nonlinear     │
│     transforms                      │
│  6. Edit scoring.ts                 │
│  7. Go to 2                         │
│                                     │
│  Stop when: target NDCG reached     │
│  or N iterations exhausted          │
└─────────────────────────────────────┘
```

**What the agent can explore** (beyond weight tuning):

- Nonlinear transforms (e.g., `similarity^2` to amplify high matches)
- Conditional weights (e.g., weight keywords higher for junior roles where experience signal is weak)
- New derived factors (e.g., keyword rarity weighting, title similarity)
- Threshold-based scoring (e.g., experience outside range = hard 0 instead of linear decay)
- Entirely different formulas (e.g., multiplicative instead of additive)

**Why this works**: scoring.ts is a pure function with no side effects or infra dependencies. The agent can modify it, run evals in <1 second, and iterate hundreds of times. The constraint is clear (maximize NDCG@10 against recruiter labels), the feedback loop is fast, and the search space is small enough for an LLM to reason about but large enough that manual exploration is tedious.

**Guard rails**:

- Agent must not overfit — eval against held-out test set after convergence
- Keep the function readable — reject solutions the team can't understand or explain to recruiters
- Version control each iteration — git commit per attempt for auditability
- Human review of final formula before shipping

### 4d. New Factor Discovery

**Task**: are there scoring signals we're missing?

Candidate factors to test (add one at a time, measure NDCG lift):


| Candidate factor      | How to compute                                                        |
| --------------------- | --------------------------------------------------------------------- |
| Title similarity      | Fuzzy match or embedding similarity between role titles               |
| Industry/domain match | LLM-classified industry tags, binary match                            |
| Recency of experience | Weight recent roles higher (from resume timeline)                     |
| Skill rarity          | Rare keyword matches score higher than common ones (TF-IDF weighting) |
| Seniority alignment   | Ordinal distance between JD seniority and talent's inferred seniority |


---

## Group 5: End-to-End Matching Eval

What: measure the full pipeline — from raw JD text to final ranked candidate list — against recruiter ground truth.

### 5a. Full Pipeline Eval

**Task**: given a raw JD and the full talent pool, does the system produce a ranking that matches recruiter preferences?

**Dataset format**:

```jsonc
{
  "id": "e2e-eval-008",
  "raw_jd": "We are hiring a...",
  "recruiter_top_5": ["t-3", "t-1", "t-7", "t-12", "t-4"],
  "recruiter_rejects": ["t-9", "t-15"]
}
```

**Graders**:


| Metric          | What it measures                                                                      |
| --------------- | ------------------------------------------------------------------------------------- |
| Recall@10       | How many of recruiter's top 5 appear in system's top 10?                              |
| NDCG@10         | Ranking quality — are recruiter favorites near the top?                               |
| Rejection check | Zero recruiter-rejected candidates in top 10                                          |
| Precision@5     | Of system's top 5, how many would recruiter approve? (LLM grader or human spot-check) |


**Trials**: run 3 trials per task (LLM extraction is non-deterministic). Report pass^3 for consistency.

### 5b. A/B Comparison (Pairwise)

For comparing full pipeline configurations (model A vs model B):

**Method**: show recruiter two anonymized ranked lists for same JD, ask which ranking is better. Avoids absolute labeling bias.

**Grader**: win rate across comparisons (binomial test for statistical significance, need ~50+ comparisons).

---

## Eval Tooling

Two approaches: custom scripts (full control, no dependencies) or eval frameworks (UI, tracing, comparison out of the box). Can start with scripts and migrate to a framework as eval count grows.

### Option A: Custom Scripts (Vitest-based)

Run evals as Vitest test suites. Already in the stack, zero new dependencies.

```ts
// evals/extraction/jd-extraction.eval.ts
import { describe, it, expect } from "vitest"
import { loadDataset } from "../helpers/dataset"
import { keywordF1, exactMatch } from "../helpers/graders"

const dataset = await loadDataset("jd-extraction")

describe("JD extraction eval", () => {
  for (const task of dataset) {
    it(`${task.id}: field accuracy`, async () => {
      const result = await extractJd(task.input)
      expect(exactMatch(result.seniority, task.expected.seniority)).toBe(true)
      expect(exactMatch(result.workMode, task.expected.workMode)).toBe(true)
      expect(keywordF1(result.keywords, task.expected.keywords)).toBeGreaterThan(0.7)
    })
  }
})
```

**Pros**: no new deps, runs in CI, familiar API, fast iteration
**Cons**: no UI, no tracing, no run-over-run comparison, manual metric aggregation

### Option B: Eval Frameworks


| Framework                                                | What it is                                                                                                        | Pros                                                                                                                | Cons                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Evalite](https://github.com/mattpocock/evalite)         | TypeScript-native, local-first eval runner with web UI                                                            | TS-native (fits our stack), local data (privacy), watch mode for iteration, built-in dashboard at localhost:5173    | Newer/smaller community, less enterprise features                                 |
| [EvalKit](https://github.com/evalkit/evalkit)            | TypeScript eval library with built-in metrics (bias, coherence, hallucination, semantic similarity, faithfulness) | Rich metric library out of the box, Apache 2.0, Turborepo monorepo (similar to ours)                                | Younger project, less adoption                                                    |
| [Langfuse](https://github.com/langfuse/langfuse)         | Open-source LLM observability + eval platform (tracing, scoring, prompt management)                               | Production tracing + evals in one tool, prompt versioning, dataset management, self-hostable, team collaboration UI | Heavier (separate service to run), Python-first SDK (TS SDK exists but secondary) |
| [Braintrust](https://www.braintrust.dev/)                | Eval + observability platform with diff-based comparison                                                          | Excellent run-over-run comparison UI, prompt playground, logging                                                    | SaaS (data leaves your infra), commercial                                         |
| [Promptfoo](https://github.com/promptfoo/promptfoo)      | CLI-first eval tool, YAML-driven, model comparison focus                                                          | Great for A/B model comparison (exactly our Group 1 use case), local, supports many providers, red-teaming built-in | YAML config can get verbose, less programmatic control                            |
| [Autoevals](https://github.com/braintrustdata/autoevals) | Library of LLM-as-judge graders (factuality, relevance, summary quality)                                          | Plug-and-play graders, works standalone or with Braintrust, small footprint                                         | Just graders, not a full framework                                                |


---

## Eval Infrastructure

### Harness Requirements

- **Isolation**: each trial runs against clean vector DB state — no cross-trial contamination
- **Determinism**: seed random where possible, pin model versions, log full config
- **Storage**: save all transcripts (LLM inputs/outputs) for debugging false failures
- **Cost tracking**: log token usage and API costs per eval run

### Run Cadence


| Eval group           | When to run                                             |
| -------------------- | ------------------------------------------------------- |
| Extraction (Group 1) | On prompt changes, model upgrades                       |
| Embedding (Group 2)  | When evaluating new models (infrequent)                 |
| Retrieval (Group 3)  | On vector DB config changes, new scale thresholds       |
| Scoring (Group 4)    | After new labeled data arrives, quarterly weight review |
| End-to-end (Group 5) | Before major releases, after any component change       |


### Progression

1. Start with Group 1 (extraction) — cheapest, fastest feedback loop, most labeled data available
2. Once extraction is stable, run Group 2 (embeddings) to pick best model
3. Groups 3 + 4 together once we have enough labeled matches
4. Group 5 as integration gate before shipping changes

---

## Summary Table


| Group                    | What               | Primary grader type | Key metric                       | Min dataset              |
| ------------------------ | ------------------ | ------------------- | -------------------------------- | ------------------------ |
| 1a. JD extraction        | Field accuracy     | Code + LLM rubric   | Keyword F1 + field accuracy      | 200 JDs                  |
| 1b. Resume extraction    | Field accuracy     | Code + LLM rubric   | Keyword F1 + experience accuracy | 200 resumes              |
| 1c. Question generation  | Relevance          | LLM rubric + code   | Topic coverage                   | 50 ambiguous JDs         |
| 2a. Embedding models     | Retrieval quality  | Code                | Recall@50, MRR                   | 100 labeled pairs        |
| 2b. Text preparation     | Retrieval quality  | Code                | Recall@50, MRR                   | Same as 2a               |
| 3a. Retrieval + filters  | Filter + relevance | Code                | Filter correctness, Recall@50    | 50 JDs with labels       |
| 3b. Retrieval latency    | Performance        | Code                | p50, p95 latency                 | 1K–100K vectors          |
| 4a. Weight optimization  | Ranking quality    | Code                | NDCG@10, Kendall's tau           | 100 labeled matches      |
| 4b. Factor ablation      | Factor value       | Code                | NDCG@10 delta                    | Same as 4a               |
| 4c. Agent-driven formula | Formula discovery  | Agent + code        | NDCG@10 convergence              | Same as 4a               |
| 4d. New factors          | Improvement signal | Code                | NDCG@10 lift                     | Same as 4a               |
| 5a. End-to-end           | Full pipeline      | Code + human        | Recall@10, NDCG@10               | 50 JDs with ranked lists |
| 5b. A/B pairwise         | Config comparison  | Human               | Win rate                         | 50 comparisons           |


