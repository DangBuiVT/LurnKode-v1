# LurnKode — instructions for Codex / coding agents

> **Read first.** This is a project-context and collaboration contract, NOT a statement that the
> entire system has been implemented. Before editing M4, read `apps/rag-service/AGENTS.md`,
> `docs/architecture/m4-rag.md`, `docs/contracts/m4-rag-api.md`, and `docs/plans/m4-rag-checklist.md`.

## Project

LurnKode (CO3103, HK261, HCMUT) is an AI-assisted programming-learning LMS with
course-grounded AI tutoring, MCQ/programming assessments, and automated code execution.
The MVP supports learner/instructor/administrator roles, structured learning, assessment,
progress, discussion, and basic administration. Payment and livestreaming are excluded.

Architecture target: **Next.js / TypeScript → Bun + ElysiaJS REST → PostgreSQL + Drizzle**;
`pgvector` serves embeddings; Redis queues judge submissions; Docker sandbox isolates
untrusted code. M4 RAG is an independently maintained service/module. This is the **target**, not
proof of complete deployments. The original repository was primarily project docs and `.agents`.

| Module | Owner / boundaries |
|---|---|
| M1 | Auth, API gateway, RBAC, infrastructure integration, security. |
| M2 | `Course → Chapter → Lesson → Material`, publication, enrollment, progress, discussion. |
| M3 | Assessments, MCQ/programming problems, attempts and grading. |
| **M4** | Source ingestion, Markdown chunking, embeddings, retrieval, grounded answers, citations, OOS rejection, conversation/feedback and evaluation. |
| M5 | Frontend UI, learner/instructor/admin flows and AI tutor UI. |
| M6 | Judge worker, execution queue, Docker sandbox, integrity monitoring, CI/QA. |

## Authoritative sources, in priority order

1. `docs/references/LurnKode-Proposal.pdf`: agreed high-level project requirements and M4 acceptance story US-02/US-03.
2. `docs/references/M4-RAG-Technical-Specification.docx` (17 Oct 2026): detailed M4 target **and proposed contracts**; do not confuse its description of a separate `RAG-AI.zip` snapshot with this repository.
3. `docs/references/M2-Techstack.md`: proposed M2 entities and RAG eligibility metadata.
4. `docs/references/M1-Core-API.pdf`: M1 API shape/security recommendations.
5. Actual implemented source code and tested migrations in the **current** repository (if conflicting, ask for review rather than silently rewriting).

Source copies are included in `docs/references/`. Check `docs/architecture/m4-rag.md` for
self-contained decisions. Do not claim M1/M2 APIs are implemented unless tested.

## M4 non-negotiable rules

- M2 owns content. M4 obtains eligible sources from a **proposed** M2 internal contract,
  not cross-module joins into M2 tables. The provided M2 document flags `is_rag_source`, but
  does NOT actually define a deployed `GET /internal/rag-materials` endpoint.
- Index only **published** `markdown` materials with `is_rag_source=true` and nonempty text.
  `Course → Chapter → Lesson → Material` is the hierarchy; there is no `material.status`.
- M2 proposed `uuid` primary keys; M4 must use compatible external IDs after confirmation.
  Earlier unrelated RAG schema used integers: do **not** copy that mismatch.
- M1 owns authentication and global RBAC. M4 validates an M1-approved identity and verifies
  **course access**, conversation ownership, and message ownership server-side. Never trust
  user IDs or roles in a request body. An internal service key is not learner authentication.
- Every similarity search must be scoped to the **authorized course** and only active eligible
  source versions. No all-course or web search in MVP.
- Preserve historical cited chunks on reindex/unpublish; deactivate older versions for retrieval
  rather than physically deleting cited evidence. Confirm retention and privacy policies.
- Embedding model ID, dimension, chunker version, normalization and prompt constraints are
  part of compatibility. 384 dimensions reflect a **proposed schema**, not a selected provider.
- Markdown content, AI prompts and responses are untrusted. Prevent prompt injection and
  cross-course leakage. Citation IDs are generated/checked against retrieved server-side chunks.
  **Citation existence is not the same as verified grounding.**
- Insufficient evidence means explicit `out_of_scope`, **no fabricated citations** and a persisted
  refusal where conversation storage is available.
- Helpful/unhelpful feedback is evaluation input, not foundation-model fine-tuning.
- Never execute learner code in M4 (M6 does this inside sandbox containers).

## How to work in this repo

1. Inspect actual folders, tests and relevant documents before changing contracts.
2. Describe proposed cross-module API/database changes before implementing them.
3. Work in `apps/rag-service/` for M4; touch shared contracts with approval.
4. Keep domain/use-cases separate from REST transport, M2 client, pgvector and model adapters.
5. Make every adapter swappable through ports; no hardcoded provider access in core domain.
6. Write regression tests for every security check, source revision and citation behavior.
7. Run `bun test`, `bun run typecheck` when dependencies/Bun are available; record blockers
   truthfully. Local Node tests are possible with `node --experimental-strip-types --test`.
8. Update docs and `docs/plans/m4-rag-checklist.md` after actual implementation.
9. Do not remove MOCK-only production startup guard before real authentication, M2, DB,
   LLM/embedding provider, integration and deployment tests pass.

## Planned contract resolution / blockers

**P0**: agree ID formats with M1/M2; publication+eligibility API payload (including pagination
and withdraw events); M1 identity and course entitlement verification; database topology;
embedding provider/model dimensions; immutable cited-chunk lifecycle; retention policy.
**P1**: citation navigation URLs; calibrated retrieval thresholds, evaluation samples and
metrics; race handling and scheduled batch sync; latency/cost targets.

Use `.agents/` repository skills as optional reference, not as precedence over this project's
security and interface decisions.
