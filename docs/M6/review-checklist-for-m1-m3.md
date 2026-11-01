# M6 Contract Review Checklist for M1 and M3

**Purpose:** Capture approvals and unresolved questions before treating M6 contracts as v1.0.  
**Status:** All items initially `OPEN` because no M1/M3 contract has been agreed yet.

## A. M3 — Assessment and grading

| ID | Decision to confirm | M6 proposal | Status |
|---|---|---|---|
| M3-01 | Stable identifier for a logical code submission/revision | M3 provides `clientSubmissionId` UUID; retries reuse the same identity | OPEN |
| M3-02 | How to provide hidden tests/config | Request contains an immutable `judgePackage` snapshot for v0.1; versioned package-fetch API is alternative | OPEN |
| M3-03 | Runtime limits | M6 enforces proposal baseline: 1 CPU, 128 MB, 3 seconds; any overrides remain below M6 hard ceilings | OPEN |
| M3-04 | Output comparison | M3 chooses default and semantics for `exact`, `normalize_line_endings`, or `trim_trailing_whitespace` | OPEN |
| M3-05 | C++ compile failure | Add `CE` verdict (recommended), with bounded/sanitized diagnostics | OPEN |
| M3-06 | Memory-limit verdict | Decide `MLE` vs agreed mapping; always log a technical memory-limit event | OPEN |
| M3-07 | Result delivery | Internal REST callback from M6 to M3 with retries and stable `eventId` | OPEN |
| M3-08 | Callback route/authentication | M3 names receiving endpoint and agrees service-auth method with M1 | OPEN |
| M3-09 | Data ownership | M3 owns attempts/final scores; M6 owns execution records and result facts | OPEN |
| M3-10 | Retention | Agree how long M6 stores source/test snapshots and when they are deleted | OPEN |
| M3-11 | Result meaning | `executionStatus` is separate from learner verdict; infra failure must not be mapped to WA | OPEN |

## B. M1 — Backend, security, integration, audit

| ID | Decision to confirm | M6 proposal | Status |
|---|---|---|---|
| M1-01 | Monorepo path | `apps/judge-service/`, adjusted to root conventions | OPEN |
| M1-02 | Internal API version/path | `/internal/v1/...` is a placeholder until M1 confirms API conventions | OPEN |
| M1-03 | Service-to-service auth | Dedicated machine credentials; do not reuse learner cookies/session tokens | OPEN |
| M1-04 | Shared PostgreSQL | Same instance may be used for MVP, but M6 owns its tables/schema and does not write M3 tables | OPEN |
| M1-05 | Redis ownership/URL | Use approved Redis deployment/config; M6 queue names prefixed/namespaced | OPEN |
| M1-06 | Central integrity events | M6 emits technical events; M1 confirms endpoint/schema/severity and review ownership | OPEN |
| M1-07 | Logging/trace ID | Use shared correlation ID/logging conventions if available | OPEN |
| M1-08 | Local Compose boundary | Agree whether M6 adds to root Compose or provides a standalone development overlay | OPEN |
| M1-09 | CI/branch rules | GitHub Actions workflow and required checks align with repository policy | OPEN |

## C. M6 — Technical proof gates

| ID | Gate | Evidence needed | Status |
|---|---|---|---|
| M6-01 | Bun + BullMQ compatibility | Minimal queue producer/worker tests on pinned versions and chosen Bun Redis adapter | NOT RUN |
| M6-02 | Worker recovery | Kill/restart/stalled-job tests; no duplicate final result | NOT RUN |
| M6-03 | Python runner | AC, WA, TLE, RTE and resource-limit tests | NOT RUN |
| M6-04 | C++ runner | compile success/failure plus runtime tests; compile limits separated from run limits | NOT RUN |
| M6-05 | Sandbox isolation | No network, no host-sensitive file access, non-root, resource controls, cleanup | NOT RUN |
| M6-06 | Callback reliability | transient error/retry and repeated callback acceptance test | NOT RUN |
| M6-07 | Integrity delivery | stable event ID, retry/backlog behavior, redacted metadata | NOT RUN |
| M6-08 | GitHub Actions | PR checks execute on clean checkout and fail for a deliberately failing test | NOT RUN |

## Approval record

| Reviewer | Decision | Date | Notes |
|---|---|---|---|
| M1 | Pending | — | — |
| M3 | Pending | — | — |
| M6 | Draft owner | 2026-10-11 | v0.1 created for review |

When an item is decided, update this table and the relevant contract/ADR in the same change. Do not mark a contract `Approved` based on an informal assumption.
