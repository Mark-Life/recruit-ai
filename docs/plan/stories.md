# Recruit AI - UX Stories (POC)

## Core Flow

JD in → clarifying questions → structured extraction (tags, categories) → vector + tag matching → ranked talents out

---

## Story 1: Submit Job Description

User pastes a raw job description into the system. System accepts it and kicks off the enrichment pipeline.

**Acceptance criteria:**

- User can paste free-text JD
- System acknowledges receipt and begins processing

---

## Story 2: Clarifying Questions (Hygiene)

System analyzes the JD and generates targeted follow-up questions for missing context. The LLM decides which questions to ask based on what's already present in the JD — if the JD already covers a topic, skip that question.

**Possible questions:**

- Work mode (office / hybrid / remote)
- Hiring geography (city, country, region, worldwide)
- Relocation support (yes/no, terms)
- Employment type (full-time, contract, freelance)
- Seniority level if unclear
- Budget range / compensation band
- Timeline / urgency

**Acceptance criteria:**

- System only asks questions for information not already present in the JD
- User answers inline (conversational or form-based)
- Answers are merged with original JD for downstream processing

---

## Story 3: Structured Extraction

After clarifying answers come in, the pipeline produces a structured representation of the enriched JD.

**Outputs:**

- Normalized tags (skills, technologies, tools)
- Categories (role family, seniority band, domain)
- Structured fields (location constraints, work mode, employment type)
- Embedding vector from the enriched JD

**Acceptance criteria:**

- Tags and categories are deterministic and normalized (e.g. "React.js" and "ReactJS" → "React")
- Structured output conforms to domain model (`JobDescription` schema)
- Embedding is generated and stored for vector search

---

## Story 4: Talent Matching

System runs vector similarity + tag/category filtering against the talent pool. Returns ranked matches with score breakdown.

**Matching signals:**

- Semantic similarity (vector cosine distance)
- Keyword / tag overlap
- Constraint fit (location, work mode, employment type)
- Experience / seniority alignment

**Acceptance criteria:**

- Results combine vector search with tag-based filtering
- Talents that violate hard constraints (e.g. wrong geography, no relocation) are excluded
- Each match includes a score breakdown explaining why it ranked

---

## Story 5: View Results

User sees ranked talents with explanations of why they matched.

**Acceptance criteria:**

- Ranked list with match scores
- Per-talent breakdown: overlapping skills, experience fit, location compatibility
- Covering recruiter info displayed alongside each talent

---

## Future: Background Re-matching

Not in POC scope. Noted here for architectural awareness.

When new talents are ingested into the pool, active JDs should be re-evaluated. Efficient approach: store enriched JD vectors + tag filters, and when a new talent arrives, use tag categories as a cheap pre-filter before vector search. A new HR talent should never trigger recomputation against a software engineering JD.
