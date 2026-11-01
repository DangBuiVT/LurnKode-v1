# Contract Draft — M6 Integrity and Operational Events (M6 → M1)

**Version:** Draft 0.1  
**Status:** Proposed; requires M1/Audit owner review  
**Direction:** M6 emits technical/security/operational events to a M1-owned internal endpoint or approved audit ingestion mechanism

## 1. Purpose and policy

M6 observes events associated with code execution, sandbox controls, and service reliability. The initial scope is technical and operational. An event is evidence of an observation, not an automatic conclusion that a learner violated academic integrity.

Proposal alignment: suspicious activity should be logged for instructor review rather than automatically treated as a violation.

## 2. Proposed event schema

```json
{
  "schemaVersion": "1.0",
  "eventId": "e512eb40-bf0d-4102-bc8a-42f0829c34dc",
  "sourceService": "m6-judge",
  "eventType": "judge.execution.timeout",
  "occurredAt": "2026-10-11T10:00:03Z",
  "severity": "warning",
  "judgeSubmissionId": "6aefc7e9-f260-4402-bfc8-c4dc6ed4e7bd",
  "clientSubmissionId": "f8a7e9fd-92f0-4c01-9f95-0a8d2c67f7d4",
  "attemptId": "9d5c6a3e-20a5-47e2-b8a0-6c80e5adf5af",
  "traceId": "a1c1f1a4-54a2-4b7a-a71f-2df888d0b657",
  "metadata": {
    "language": "cpp",
    "timeLimitMs": 3000
  }
}
```

### Field rules

- `eventId`: stable unique ID for de-duplication and retries.
- `sourceService`: fixed identifier, not caller-controlled arbitrary text.
- `eventType`: enum controlled by M6 and reviewed with M1.
- `occurredAt`: UTC timestamp when the event was observed.
- `severity`: proposed values `info`, `warning`, `high`, `critical`; M1 should align this to the central audit taxonomy.
- Correlation IDs are optional only when an event has no submission context.
- `metadata`: allowlisted, bounded fields only. Do not add arbitrary exception objects or unfiltered request bodies.

## 3. Initial event taxonomy proposal

| Event type | Suggested severity | Meaning | Must not imply |
|---|---|---|---|
| `judge.submission.accepted` | `info` | M6 accepted a submission | Misconduct |
| `judge.execution.timeout` | `info` or `warning` | Runtime limit was enforced | Intentional abuse by itself |
| `judge.execution.memory_limit` | `warning` | Memory policy was enforced | Proven cheating |
| `judge.sandbox.cleanup_failed` | `high` | Container/process cleanup failed | Learner wrongdoing |
| `judge.sandbox.policy_mismatch` | `high` | Effective sandbox settings differ from required policy | Proven exploit without investigation |
| `judge.worker.crashed` | `high` | Worker crashed during a job | Learner wrongdoing |
| `judge.job.retry_exhausted` | `high` | Job exhausted configured retries | Learner wrongdoing |
| `judge.result_callback.failed` | `warning` or `high` | M3 result delivery remains unresolved | Grading result is lost; result must remain persisted |
| `judge.suspicious_pattern.detected` | TBD | A documented, deterministic rule observed an unusual pattern | Confirmed academic misconduct |

The suspicious-pattern event is optional and should remain disabled until M1/M3 define the rule, false-positive handling, privacy, and review workflow. It is not required for the first PoC.

## 4. Proposed delivery mechanism

Suggested endpoint: `POST /internal/v1/integrity-events` on M1, or an M1-approved equivalent. The name is not approved; M1 owns the receiving route and central audit taxonomy.

- Use service-to-service authentication configured by M1.
- Persist events/outbox rows before delivery.
- Retry transient `408`, `429`, and `5xx` responses with bounded backoff.
- Keep a stable `eventId`; M1 must de-duplicate repeated deliveries.
- If M1 is unavailable, preserve the event and expose delivery backlog/age to operations.
- Do not accept a caller-provided event destination URL.

## 5. Privacy and security rules

Never emit:

- source code or full compiler output;
- hidden test input or expected output;
- session cookies, bearer tokens, environment secrets, database URLs;
- arbitrary host paths, full process environment, or unfiltered container inspect output;
- user-facing claims that a learner cheated.

Emit only data needed to diagnose/review the observation: submission correlation IDs, language, configured limit, bounded exit/status metadata, timestamp, and trace ID.

M6 records the technical observation. M1/Audit or the instructor/admin workflow owns central review status and the final interpretation. This ownership requires M1 approval.

## 6. Open decisions for M1

1. What central audit event schema and severity taxonomy already exist, if any?
2. Is there an established internal audit ingestion endpoint, or should one be introduced?
3. Who owns review status: M1/Audit service, a separate Admin module, or a shared workflow?
4. Which M6 events are mandatory to send centrally vs. retained only in M6 operations logs?
5. What is the retention period and access policy for events?
6. Are rule-based suspicious-pattern events in MVP scope? Recommendation: defer until technical events are stable.
