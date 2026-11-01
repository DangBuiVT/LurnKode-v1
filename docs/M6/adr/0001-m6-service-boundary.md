# ADR-0001: M6 Service Boundary and Process Model

- **Status:** Proposed
- **Date:** 2026-10-11
- **Decision owners:** M6; M1/M3 review required for service contracts

## Context

LurnKode uses a microservices direction. M6 owns judge execution, queue processing, Docker isolation, execution-specific technical events, and its CI checks. CPU-heavy/untrusted code must not execute in the main API process.

## Decision proposed

1. M6 is an independently deployable microservice.
2. For the MVP, API and Worker are separate processes/containers built from one M6 codebase:
   - `judge-api`: Bun + ElysiaJS; validates/accepts submissions.
   - `judge-worker`: consumes queue jobs and coordinates Docker execution.
3. Python and C++ are separate prebuilt runner images, not separate business microservices.
4. M6 can live in the team's monorepo at `apps/judge-service/`, subject to root repo conventions.
5. M6 owns execution records and never directly updates M3-owned attempt or score tables.

## Alternatives considered

- Judge logic embedded in M1's API: rejected because it blurs isolation and scaling boundaries.
- One process for API plus worker: acceptable only for a throwaway PoC, not the target run mode.
- Completely separate repositories/services for API, worker, and each language: too much operational overhead for the MVP.

## Consequences

- API and worker can be scaled/restarted independently.
- The team must define internal contracts, error semantics, service authentication, and local orchestration.
- A shared codebase does not mean a shared process or shared ownership of M3 tables.

## Open items

- Confirm monorepo path and root Compose convention with M1.
- Confirm who owns central integrity-event review state.
