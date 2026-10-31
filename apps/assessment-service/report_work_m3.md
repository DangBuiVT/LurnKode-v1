# Interim Progress Report: M3 — Assessment Microservice

**Project:** LurnKode — AI-Assisted Learning Platform with Evidence-Based Tutoring and Automated Code Assessment (CO3103)  
**Module:** M3 — Assessment Service (`apps/assessment-service`)  
**Owner:** Nguyen Tat Dat  
**Stack:** Bun + TypeScript + ElysiaJS + Drizzle ORM + Zod + Vitest / Bun Test  
**Branch:** `feature/m3-assessment`  

---

## 1. Executive Summary & Module Scope

The **Assessment Microservice (M3)** operates as an autonomous, containerized service adopting the **Database-per-Service** pattern. It decouples high-burst assessment submissions and code judging from course browsing and lesson delivery in M2.

### Core Responsibilities:
1. **Assessment Authoring & Question Banking:** Instructor tools for creating quizzes with Multiple Choice Questions (MCQs) and Programming exercises with hidden test cases and execution limits.
2. **Anti-Cheating Projection:** Strict domain mapping (`mapItemForLearner`) ensuring answer keys and hidden test cases never leak to the client browser or DevTools.
3. **Synchronous MCQ Grading Engine:** Pure, deterministic instant evaluation returning immediate feedback.
4. **Asynchronous Code Execution Lifecycle:** Orchestrates sandboxed code submissions via message queue, tracking attempt status through `in_progress` → `grading` → `completed` with idempotent callback processing.
5. **Domain Event Broadcasting:** Publishes `assessment.attempt.completed` domain events for M2 (Course Gradebook & Progress) and M4 (AI Tutor Knowledge Analytics).

---

## 2. Completed Architecture & Deliverables

```
  M1 API Gateway ──(X-User-Id / X-User-Role)──► M3: Assessment Service (:4003)
                                                       │
               ┌───────────────────────────────────────┼────────────────────────────────────────┐
               ▼                                       ▼                                        ▼
   [Synchronous MCQ Grader]               [Asynchronous Code Queue]               [Domain Event Publisher]
    • Exact option match                   • Returns 202 Accepted                  • Emits attempt.completed
    • Instant score feedback               • Sets status = "grading"               • Aggregates total breakdown
                                                       │
                                        M6 Judge Callback (:4003/internal)
                                           • Validates test case IDs
                                           • Calculates weighted score
                                           • Finalizes attempt -> "completed"
```

### Key Technical Achievements:
- **Security Hardening:** Enforced role-based access control (401 Unauthorized for missing identity, 403 Forbidden for role mismatches) and constant-time cryptographic verification (`timingSafeEqual` over SHA-256) on internal service tokens.
- **Async State Machine:** Solved the eventual consistency race between synchronous quiz answers and asynchronous code execution. Finishing an attempt with pending judge jobs holds the attempt in `grading` status, automatically finalizing once the judge callback returns.
- **Contract Resilience:** Supports all competitive programming verdicts (`AC`, `WA`, `TLE`, `MLE`, `RE`, `CE`) plus the proposal alias `RTE` for zero-friction judge integration.
- **Demo Readiness:** Built-in auto-seeding with predictable UUIDs on server startup and a standalone CLI fake-judge harness (`bun run fake-judge <submissionId> [verdict]`).

---

## 3. Verification & Test Metrics

All service capabilities are guarded by automated tests using **native Bun Test**:

```text
bun test v1.4.3 (c6da4a4d3)

src/tests/integration/assessment.integration.test.ts ....... PASS (2 tests)
src/tests/integration/security-and-scoring.test.ts ......... PASS (8 tests)
src/tests/unit/auth.middleware.test.ts ..................... PASS (10 tests)
src/tests/unit/grading.programming.test.ts ................. PASS (5 tests)
src/tests/unit/grading.service.test.ts ..................... PASS (13 tests)

--------------------------------------------------------------------------------
TEST SUMMARY:
✅ 38 tests PASSED (0 failures, 106 assertions)
⚡ Execution time: 145 ms
🛡️ TypeScript Typecheck: 0 errors across 32 files (Exit Code 0)
--------------------------------------------------------------------------------
```

---

## 4. API Endpoints Specification

### Instructor Endpoints (Authoring)
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/instructor/assessments` | `instructor`, `admin` | Create new assessment container in `draft` status |
| `POST` | `/instructor/assessments/:id/items` | `instructor`, `admin` | Add MCQ or Programming item with test cases |
| `POST` | `/instructor/assessments/:id/publish` | `instructor`, `admin` | Validate and publish assessment for students |
| `GET` | `/instructor/assessments/:id` | `instructor`, `admin` | View full assessment details (including solutions) |

### Learner Endpoints (Exam Execution)
| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/learner/assessments/:id/attempts` | `learner`, `student` | Start attempt (returns sanitized questions without keys) |
| `POST` | `/learner/attempts/:attemptId/answers` | `learner`, `student` | Submit MCQ answer (instant grading response) |
| `POST` | `/learner/attempts/:attemptId/code-submissions`| `learner`, `student` | Submit code for async judge (returns 202 Accepted) |
| `POST` | `/learner/attempts/:attemptId/finish` | `learner`, `student` | Finish attempt (`grading` if judge pending, else `completed`) |

### Internal Integration Endpoints
| Method | Path | Auth Header | Description |
|---|---|---|---|
| `POST` | `/internal/judge/callback` | `X-Internal-Token` | Authenticated webhook from M6 Judge Worker |
| `GET` | `/health/live` | None | Liveness probe returning service metadata |

---

## 5. Peer Integration Status

- **M1 (API Gateway & Auth):** Ready. M3 expects forwarded headers `X-User-Id` and `X-User-Role`.
- **M2 (Course Management):** Ready. M3 calls `GET /internal/courses/:courseId/enrollments/:userId` (with resilient dev-fallback) and broadcasts `assessment.attempt.completed`.
- **M5 (Frontend UI):** Ready. All 4 learner endpoints and 4 instructor endpoints are locked with strict Zod validation schemas. M5 can replace mock data with live M3 APIs immediately.
- **M6 (Judge Engine):** Ready. Callback route `/internal/judge/callback` accepts verdicts with weighted partial credit calculation.
