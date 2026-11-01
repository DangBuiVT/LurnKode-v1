# M6 Judge — Demo

Vertical slice of the M6 Judge microservice described in [`docs/M6`](../docs/M6):

```
Mock M3 (+UI) ──POST──► judge-api ──► Postgres (submission + private snapshot + outbox)
                                          │
                              judge-dispatcher (outbox → BullMQ, result outbox → callback)
                                          │
                                   Redis / BullMQ (ids only)
                                          │
                                    judge-worker ──► Docker sandbox (python / cpp runner)
                                          │
                                  result + callback outbox ──► Mock M3 (idempotent)
```

## Run it

```bash
cd m6-judge
docker compose up -d --build     # postgres, redis, runner images, api, dispatcher, worker, mock-m3
open http://localhost:3000       # UI: submit Python / C++ and watch verdicts arrive via callback
```

| Service | Port | Notes |
|---|---|---|
| mock-m3 (UI + callback receiver) | 3000 | holds the service credential, browser never sees it |
| judge-api | 4000 | `POST /internal/v1/judge-submissions`, `GET /internal/v1/judge-submissions/:id` |
| postgres / redis | 5432 / 6379 | |

Dev credentials (compose only): `dev-m3-token` (submit+read), `dev-ops-token` (read), callback `dev-callback-token`.

## Tests (TDD)

```bash
bun install
bun test tests/unit                        # pure logic + orchestration with a fake sandbox
docker compose up -d postgres redis
bun test tests/integration                 # real Postgres/Redis/Docker (builds runner images)
docker compose up -d --build
bun test tests/e2e                         # whole stack through the mock-M3 callback
bun run test:cov                           # unit coverage
bun run typecheck
```

## What is implemented from the M6 docs

- **Async submission** with `Idempotency-Key` (202 / 200 + `Idempotent-Replay` / 409), `clientSubmissionId` uniqueness, server-side limit ceilings, size limits, error envelope, no source/test echo.
- **Transactional outbox** for enqueue and for result callbacks; leased rows, retry with backoff + jitter, dead-letter rows (never deleted), reconciler for stuck submissions.
- **At-least-once safe worker**: atomic claim, no second final result/callback, retryable infra failures requeue, exhausted → `failed/RETRY_EXHAUSTED` (never `WA`).
- **Docker sandbox**: no network, non-root, read-only rootfs, bounded exec tmpfs, CPU/memory/pids/output limits, caps dropped, `no-new-privileges`, argv arrays only, nothing mounted, container removed on every path. Code is passed over stdin (no bind mounts).
- **C++**: separate compile step with its own limits → `CE` with redacted/bounded message.
- **Technical events** (`timeout_enforced`, `memory_limit_exceeded`, `worker_failure`, …) stored in `judge_events` — observations, not misconduct findings.

## Known gaps / open decisions (see docs)

- Contracts are draft: `CE` verdict and the memory-limit policy (`MLE` vs `RTE` + event) are unapproved; the demo uses `RTE` + `memory_limit_exceeded`.
- `runtimeMs` is the wall-clock of the slowest container run (includes start-up); `peakMemoryMb` is intentionally omitted until validated.
- Docker (shared kernel) is the MVP baseline, not VM-grade isolation.
- M1 event endpoint and CD are out of scope; the Docker socket is mounted into the trusted worker only.
- The schema is bootstrapped by `src/db/migrate.ts`; `src/db/schema.ts` is the Drizzle type definition (queries use `postgres` directly).
