# ADR-0003: Docker as the MVP Execution Sandbox

- **Status:** Proposed, subject to sandbox PoC and security review
- **Date:** 2026-10-11
- **Decision owner:** M6; M1 reviews security assumptions

## Context

The proposal calls for a separate Judge Worker and Docker Sandbox. Initial proposal runtime limits are 1 CPU, 128 MB RAM, and 3 seconds. The MVP needs Python and C++ support and should run locally via Docker Compose.

## Decision proposed

Use prebuilt, controlled runner images for Python and C++. Only the trusted worker provisions execution containers. Never run learner source directly in the API/worker process or on the host outside a sandbox.

Proposed controls (must be implemented and tested):

- non-root user, no privileged mode, drop unnecessary capabilities;
- no network access by default;
- explicit CPU, memory, PID, timeout and output-size limits;
- read-only root filesystem where feasible plus bounded temporary write area;
- no Docker socket or sensitive host mounts inside the learner sandbox;
- kill process trees and remove containers on all exit paths;
- pin language/runtime/compiler images and manage security updates;
- keep hidden expected outputs outside learner-visible processes and logs.

## Alternatives considered

- Execute code directly on the host: rejected.
- Docker without resource/security controls: rejected.
- gVisor or Firecracker as initial baseline: deferred pending threat model/PoC because of added environment and operational complexity.

## Risks

- Containers share the host kernel; Docker hardening is not a proof against all kernel escapes.
- The trusted worker's access to Docker daemon is powerful and should be treated as a security boundary.
- The proposal's 128 MB/3-second values may not be appropriate for C++ compilation; compiler limits must be separate and validated.
- Local Docker Desktop/WSL2 behavior differs from Linux CI/production; sandbox tests should run on Linux Docker where possible.

## Decision gates

Do not mark the sandbox complete until PoC tests demonstrate resource enforcement, network restrictions, privilege restrictions, timeout handling, descendant-process cleanup, and container cleanup after worker interruption.

## References

- https://docs.docker.com/engine/containers/resource_constraints/
- https://docs.docker.com/engine/security/
- https://docs.docker.com/engine/network/
