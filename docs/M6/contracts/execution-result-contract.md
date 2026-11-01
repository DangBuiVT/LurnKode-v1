# Contract Draft — Execution Result Delivery (M6 → M3)

**Version:** Draft 0.1  
**Status:** For review; callback route and payload require M3 approval  
**Direction:** M6 sends a final execution result to M3

## 1. Proposed delivery model

M6 sends an asynchronous internal REST callback after persisting the result. M3 acknowledges the event with a `2xx` response. M6 retries transient failures and re-sends the same stable `eventId`; M3 must be idempotent.

Proposed endpoint name: `POST /internal/v1/judge-results` on M3. This is a suggested route, not an existing endpoint. M3 must provide/confirm the actual path and authentication mechanism.

The callback URL is configuration owned by M6/M1. It must never be accepted as a learner- or request-supplied `callbackUrl` (SSRF prevention).

## 2. Result payload

```json
{
  "contractVersion": "1.0",
  "eventId": "e1072b9c-62e1-4a24-a40a-0cc6c9d63980",
  "occurredAt": "2026-10-11T10:00:01.120Z",
  "judgeSubmissionId": "6aefc7e9-f260-4402-bfc8-c4dc6ed4e7bd",
  "clientSubmissionId": "f8a7e9fd-92f0-4c01-9f95-0a8d2c67f7d4",
  "attemptId": "9d5c6a3e-20a5-47e2-b8a0-6c80e5adf5af",
  "assessmentItemId": "ee62c89c-875e-4884-99b4-6f55db9f4b40",
  "revision": 1,
  "executionStatus": "completed",
  "verdict": "AC",
  "summary": {
    "totalTests": 10,
    "passedTests": 10,
    "failedTests": 0
  },
  "metrics": {
    "runtimeMs": 120,
    "peakMemoryMb": 24
  },
  "diagnostics": {
    "compileMessage": null
  },
  "traceId": "a1c1f1a4-54a2-4b7a-a71f-2df888d0b657"
}
```

### Field requirements

- `eventId`: stable across every retry of this exact callback event.
- `judgeSubmissionId`: M6-owned ID.
- `clientSubmissionId`, `attemptId`, `assessmentItemId`, and `revision`: copied from the accepted request to correlate with M3.
- `executionStatus`: `completed` or `failed`.
- `verdict`: present only when a judge verdict was produced. It must not be fabricated for infrastructure failures.
- `summary`: aggregate counts only; no hidden inputs or expected outputs.
- `metrics`: include only values that the implementation can measure correctly; `peakMemoryMb` remains optional until validated in PoC.
- `diagnostics`: safe, bounded user-facing compiler message may be included only after redaction/truncation. Never send host paths, environment variables, secrets, hidden tests, or raw infrastructure traces.

## 3. Draft execution-status / verdict semantics

`executionStatus` describes the service pipeline; `verdict` describes learner code.

| `executionStatus` | `verdict` | Meaning |
|---|---|---|
| `completed` | `AC` | All configured tests passed |
| `completed` | `WA` | At least one test output differs under the approved comparison policy |
| `completed` | `TLE` | Runtime exceeded the configured execution time limit |
| `completed` | `RTE` | Learner program terminated with a runtime failure under the agreed language policy |
| `completed` | `CE` | Proposed extension: compilation failed; requires M3 approval |
| `failed` | omitted | M6 could not reliably finish judging due to a service/configuration/infrastructure failure |

Proposal baseline explicitly lists AC, WA, TLE, and RTE. `CE` is proposed because C++ is supported but is not part of the original listed verdict set; M3 must approve it. Memory-limit handling is also open. Do not quietly add `MLE` or map it to `RTE` without approval.

Example infrastructure failure:

```json
{
  "contractVersion": "1.0",
  "eventId": "08a43ef5-3f36-4c51-9c63-d67f3bba96c2",
  "occurredAt": "2026-10-11T10:01:01Z",
  "judgeSubmissionId": "6aefc7e9-f260-4402-bfc8-c4dc6ed4e7bd",
  "clientSubmissionId": "f8a7e9fd-92f0-4c01-9f95-0a8d2c67f7d4",
  "attemptId": "9d5c6a3e-20a5-47e2-b8a0-6c80e5adf5af",
  "assessmentItemId": "ee62c89c-875e-4884-99b4-6f55db9f4b40",
  "revision": 1,
  "executionStatus": "failed",
  "failure": {
    "code": "SANDBOX_UNAVAILABLE",
    "retryable": true
  },
  "traceId": "a1c1f1a4-54a2-4b7a-a71f-2df888d0b657"
}
```

Suggested failure codes include `QUEUE_DISPATCH_FAILED`, `SANDBOX_UNAVAILABLE`, `WORKER_FAILURE`, `POLICY_CONFIGURATION_ERROR`, and `RETRY_EXHAUSTED`. The list should be stabilized after PoC.

## 4. Delivery, retry, and idempotency

- Persist the final result and callback-outbox event atomically before attempting delivery.
- The callback uses a stable `eventId` and `Idempotency-Key: <eventId>`.
- The destination is configured internally and authenticated with M1-approved service credentials.
- `2xx`: mark delivery acknowledged.
- `408`, `429`, and `5xx`: retry with bounded exponential backoff and jitter (exact attempts/durations are configuration decisions).
- Other `4xx`: stop automatic rapid retries, record the failure and alert/retain for operator remediation. A credential or schema problem may be retried manually after repair.
- Exhausted delivery retries must not delete the result. Keep a pending/dead-letter delivery record and provide an operator reconciliation path.
- M3 must treat duplicate delivery as the same event, not a new grade or a duplicate attempt. Suggested idempotency key: `eventId`; secondary uniqueness can be `(judgeSubmissionId, revision, resultEventType)` if M3 agrees.

No exactly-once guarantee should be claimed across PostgreSQL, Redis, and HTTP. The target is durable at-least-once delivery with idempotent consumers.

## 5. M3 ownership and behavior

M3 remains the system of record for attempts, answers, assessment grading strategy, and final learner-facing grade. M6 returns execution facts and verdicts only; M6 must not update M3-owned score tables directly.

M3 should:

1. authenticate the callback;
2. validate schema/version and correlate all IDs with the submission it initiated;
3. de-duplicate by `eventId` (and reject inconsistent payloads for an already-seen event ID);
4. update the appropriate attempt/result record according to M3's grading model;
5. return `2xx` only after the event is durably accepted, or follow an agreed asynchronous acknowledgment design.

## 6. Open decisions for M3/M1

1. Confirm endpoint path and auth mechanism.
2. Approve callback delivery instead of polling or a broker event.
3. Approve verdict additions `CE` and the memory-limit verdict policy.
4. Agree which metrics are meaningful and which are optional.
5. Confirm callback retry window, retention, and operator remediation procedure.
6. Decide whether a result callback updates an attempt directly or first becomes a submission-result record in M3.
