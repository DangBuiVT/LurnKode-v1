# M3 Assessment Service — Interim Progress Report

## 1. Key Accomplishments

1. **Assessment Authoring (Instructor):** Full support for Multiple-Choice Questions (MCQ) and Programming challenges with weighted test cases, execution limits (CPU, memory, timeout), and publishing validation.
2. **Anti-Cheating Data Sanitization:** `mapItemForLearner` strictly strips `correctOptionIds` and hidden test cases before payloads reach the learner browser.
3. **Dual-Engine Automated Grading:**
   - **MCQ (Synchronous):** Instant evaluation via `gradeMcq()` returning immediate points.
   - **Code (Asynchronous):** Non-blocking submission (`202 Accepted`), attempt state holds in `grading` until M6 judge callback calculates partial credit (`AC`, `WA`, `TLE`, `MLE`, `RE`/`RTE`, `CE`) and marks attempt `completed`.
4. **Security & Resilient Inter-Service RBAC:** Enforced role-based access control (401/403), timing-safe token verification (`timingSafeEqual`), and development fallback handlers for unrouted M2 internal calls.
5. **Interactive Demo & Verification Harness:** Built-in auto-seeding on server startup and CLI fake judge runner (`bun run fake-judge <submissionId> [verdict]`).

---

## 2. Test & Quality Metrics

```text
bun test (native runner)
✅ 38 tests PASSED (0 failures, 106 assertions)
⚡ Execution time: ~270 ms
🛡️ TypeScript Typecheck: 0 errors across 32 files
📦 Container: oven/bun:1.2.4-alpine (Production ready, Healthchecked)
```

---

## 3. API Surface & Architecture

| Role | Method | Endpoint | Purpose |
|---|---|---|---|
| **Instructor** | `POST` | `/instructor/assessments` | Create draft assessment container |
| | `POST` | `/instructor/assessments/:id/items` | Add MCQ or Code challenge |
| | `POST` | `/instructor/assessments/:id/publish` | Validate and publish assessment |
| | `GET` | `/instructor/assessments/:id` | View full details with answer keys |
| **Learner** | `POST` | `/learner/assessments/:id/attempts` | Start attempt (returns sanitized questions) |
| | `POST` | `/learner/attempts/:id/answers` | Submit MCQ answer (instant score) |
| | `POST` | `/learner/attempts/:id/code-submissions`| Submit code for async judge (202 Accepted) |
| | `POST` | `/learner/attempts/:id/finish` | Finish attempt (`grading` $\rightarrow$ `completed`) |
| **Internal** | `POST` | `/internal/judge/callback` | Authenticated webhook from M6 Judge Worker |

---

## 4. Team Integration Status

- **M1 (API Gateway):** Forward `/learner/*` and `/instructor/*` to M3 (`:4003`) with `X-User-Id` and `X-User-Role`.
- **M2 (Course Service):** M3 verifies enrollment via `GET /internal/courses/:id/enrollments/:uid` (dev-fallback active) and emits `assessment.attempt.completed` domain event.
- **M5 (Frontend UI):** All 8 APIs locked with Zod schemas. M5 can replace `mock-db.ts` with live M3 APIs immediately.
- **M6 (Judge Worker):** Callback endpoint tested and ready.
