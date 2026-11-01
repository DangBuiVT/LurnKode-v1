# ADR-0002: Bun + ElysiaJS with BullMQ + Redis

- **Status:** Proposed, subject to PoC
- **Date:** 2026-10-11
- **Decision owner:** M6; align with M1's shared runtime conventions

## Context

The LurnKode proposal names Bun + ElysiaJS for the API/backend and Redis for cache/queue. The M6 owner selected Bun, BullMQ, and Redis for the Judge Service direction.

## Decision proposed

- Runtime: Bun + TypeScript.
- HTTP framework: ElysiaJS.
- Queue: BullMQ on Redis.
- API and worker run as separate processes.
- Use a stable job ID derived from the persisted M6 submission ID; the job payload carries IDs and trace metadata only.
- Use database uniqueness/state guards and a durable outbox/reconciliation strategy because job processing can occur more than once.

## Rationale

- Aligns with the project's intended TypeScript/Bun stack.
- BullMQ provides queue lifecycle, worker, retries/backoff and stalled-job behavior that would otherwise need to be reimplemented.
- Redis is already in the proposal; no new broker is required for the MVP.

## Risks and proof gate

BullMQ's current project/docs show Bun support and a Bun Redis adapter, but not every path should be assumed equivalent across runtimes/clients. The PoC must use pinned versions and the intended Bun adapter, and test enqueue/consume, reconnection, shutdown, retry, stalled jobs, and worker restart. Keep CPU-heavy learner code outside the Bun event loop inside Docker; worker bookkeeping must remain responsive.

Fallback if critical queue behavior fails: keep the M6 API on Bun/ElysiaJS but run the worker process on a compatible Node.js LTS runtime while retaining BullMQ + Redis. A fallback is not an approved stack change until the PoC demonstrates the need.

## Consequences

- The project must pin Bun, BullMQ, and Redis/client versions and record the tested matrix.
- Queue processing is at-least-once, not exactly-once; idempotency is required.
- The worker must implement graceful shutdown and expose queue/stall/retry metrics.

## References

- https://docs.bullmq.io/guide/workers
- https://docs.bullmq.io/guide/retrying-failing-jobs
- https://docs.bullmq.io/bull/important-notes
- https://github.com/taskforcesh/bullmq/blob/master/docs/gitbook/guide/connections.md
