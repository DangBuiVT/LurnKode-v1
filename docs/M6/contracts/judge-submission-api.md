# Contract Draft — Judge Submission API (M3 → M6)

**Version:** Draft 0.1  
**Status:** For review with M3 and M1; not approved  
**Direction:** M3 Assessment Service calls M6 Judge API

## 1. Purpose

Accept an authorized programming submission, persist a private immutable snapshot, enqueue asynchronous judging, and return a stable M6 submission identifier. The HTTP request must not remain open while code is compiled or executed.

## 2. Proposed endpoint

`POST /internal/v1/judge-submissions`

The route is proposed. M1 should confirm the internal routing, API prefix conventions, authentication middleware, and service-to-service credential pattern.

### Required request headers

```http
Authorization: Bearer <M3-service-credential>
Idempotency-Key: <stable-key-for-this-logical-submission>
Content-Type: application/json
X-Trace-Id: <optional-correlation-id>
```

- The service credential is machine-to-machine authentication, not a learner's cookie/session token.
- Credentials come from the approved secret mechanism; never commit them or log them.
- `Idempotency-Key` must remain stable when M3 retries the same logical submission. A changed source-code revision is a new logical submission and must use a new key.

## 3. Request body (draft schema)

```json
{
  "contractVersion": "1.0",
  "clientSubmissionId": "f8a7e9fd-92f0-4c01-9f95-0a8d2c67f7d4",
  "attemptId": "9d5c6a3e-20a5-47e2-b8a0-6c80e5adf5af",
  "assessmentItemId": "ee62c89c-875e-4884-99b4-6f55db9f4b40",
  "revision": 1,
  "language": "cpp",
  "sourceCode": "#include <iostream>\nint main(){ std::cout << 5; }",
  "judgePackage": {
    "packageId": "math-sum-v3",
    "version": 3,
    "comparisonMode": "exact",
    "testCases": [
      {
        "testCaseId": "tc-001",
        "stdin": "2 3\n",
        "expectedOutput": "5"
      }
    ]
  },
  "requestedRuntimeLimits": {
    "cpuCores": 1,
    "memoryLimitMb": 128,
    "timeLimitMs": 3000
  }
}
```

### Field semantics

| Field | Required | Meaning / constraint |
|---|---|---|
| `contractVersion` | Yes | Contract schema version, currently `1.0` draft |
| `clientSubmissionId` | Yes | Stable UUID assigned by M3 for one logical submission revision |
| `attemptId` | Yes | M3-owned assessment attempt identifier; M6 treats it as an external reference |
| `assessmentItemId` | Yes | M3-owned item identifier; external reference only |
| `revision` | Yes | Positive revision number; changes to code or judged content require an agreed revisioning rule |
| `language` | Yes | `python` or `cpp` |
| `sourceCode` | Yes | Source text; enforce a service-owned maximum byte length (exact limit TBD by M6 PoC/configuration) |
| `judgePackage.packageId` | Yes | Stable assessment/judge configuration identifier from M3 |
| `judgePackage.version` | Yes | Immutable version of test/config package used for this submission |
| `comparisonMode` | Yes | Draft enum: `exact`, `normalize_line_endings`, `trim_trailing_whitespace`; semantics/default need M3 approval |
| `testCases` | Yes in this payload-based draft | Private test snapshot sent over authenticated internal API; test count and combined payload size must be bounded |
| `requestedRuntimeLimits` | Optional | M6 must enforce server-side policy ceilings. The proposal's baseline is 1 CPU, 128 MB RAM, 3000 ms runtime. Caller values must never increase the configured maximum |

### Hidden test package decision

This draft assumes M3 sends an immutable judge-package snapshot in the internal request. M6 persists it in restricted M6-owned storage for reliable retries/reproducibility. The snapshot and expected outputs must never be returned to learners or written to logs.

**M3 must confirm one of these alternatives:**

- **Option A (draft default):** M3 sends the immutable `judgePackage` in the submission request; M6 stores a private snapshot.
- **Option B:** M3 exposes an authenticated internal endpoint to fetch a versioned judge package by identifier; M6 receives only the package reference and fetches it server-to-server.

Option A is simpler for the first integration. Option B reduces the test payload transferred through the submit endpoint but creates an additional M3 contract and dependency. Neither is approved yet.

## 4. Successful response

New submission: `202 Accepted`.

```json
{
  "contractVersion": "1.0",
  "judgeSubmissionId": "6aefc7e9-f260-4402-bfc8-c4dc6ed4e7bd",
  "clientSubmissionId": "f8a7e9fd-92f0-4c01-9f95-0a8d2c67f7d4",
  "status": "queued",
  "acceptedAt": "2026-10-11T10:00:00Z",
  "traceId": "a1c1f1a4-54a2-4b7a-a71f-2df888d0b657"
}
```

`202` means M6 accepted the request for asynchronous processing. It does not mean the code was compiled or judged.

### Duplicate/idempotent request behavior

- Same authenticated caller + same `Idempotency-Key` + same canonical request body: return the existing `judgeSubmissionId` and current state; propose `200 OK` with the same response shape and an `Idempotent-Replay: true` header.
- Same key with a materially different canonical payload: `409 IDEMPOTENCY_KEY_REUSED`.
- Duplicate `clientSubmissionId` with a different idempotency key: `409 CLIENT_SUBMISSION_ALREADY_EXISTS` unless M3/M6 explicitly define it as a retry. Stable retry behavior must be confirmed during contract review.
- A code edit/new revision is a new submission identity. Do not overwrite an already accepted immutable snapshot.

## 5. Proposed status endpoint

`GET /internal/v1/judge-submissions/{judgeSubmissionId}`

This is intended for authorized internal reconciliation/operations, not direct browser polling. It must not return source code, hidden test inputs, or expected outputs.

Example response:

```json
{
  "judgeSubmissionId": "6aefc7e9-f260-4402-bfc8-c4dc6ed4e7bd",
  "clientSubmissionId": "f8a7e9fd-92f0-4c01-9f95-0a8d2c67f7d4",
  "status": "completed",
  "verdict": "AC",
  "createdAt": "2026-10-11T10:00:00Z",
  "startedAt": "2026-10-11T10:00:01Z",
  "finishedAt": "2026-10-11T10:00:01.120Z"
}
```

## 6. Error response envelope

```json
{
  "error": {
    "code": "UNSUPPORTED_LANGUAGE",
    "message": "The requested language is not supported.",
    "traceId": "a1c1f1a4-54a2-4b7a-a71f-2df888d0b657",
    "retryable": false
  }
}
```

Do not echo source code, hidden tests, credentials, or raw internal exception messages in errors.

| HTTP status | Example code | Meaning | Retry? |
|---|---|---|---|
| `400` | `INVALID_REQUEST` | Malformed body or invalid schema | No, fix request |
| `401` | `UNAUTHENTICATED_SERVICE` | Missing/invalid service credentials | Fix credentials; retry only after configuration is fixed |
| `403` | `SERVICE_NOT_ALLOWED` | Authenticated service lacks permission | No, fix authorization |
| `409` | `IDEMPOTENCY_KEY_REUSED` | Same key used for different content | No, reconcile identity |
| `413` | `PAYLOAD_TOO_LARGE` | Source/test package exceeds configured limit | No, reduce payload |
| `422` | `UNSUPPORTED_LANGUAGE`, `INVALID_JUDGE_PACKAGE`, `LIMIT_EXCEEDS_POLICY` | Request is structurally valid but cannot be judged as requested | No, fix request/configuration |
| `429` | `RATE_LIMITED` | Caller exceeds configured rate | Yes, respect retry guidance |
| `503` | `DEPENDENCY_UNAVAILABLE` | Required persistence/queue dependency unavailable before acceptance | Yes, same idempotency key |

Once M6 has returned `202`, M6 is responsible for tracking the accepted submission and exposing terminal state through callback/reconciliation even if Redis or a worker subsequently fails.

## 7. Security and privacy requirements

- Only approved internal services may call this endpoint.
- Apply request/body-size limits before full payload buffering where possible.
- Validate language against an allowlist; do not accept arbitrary image, command, shell, mount, environment, or network values.
- Never trust caller-provided resource limits above M6 server policy.
- Do not log `sourceCode`, `testCases`, expected outputs, service credentials, or secrets.
- Store a source/payload hash for audit/correlation if useful; do not treat a hash as a replacement for access controls.
- Define retention/deletion of payload snapshots with the team before production use.

## 8. Open decisions for M3/M1

1. Does M3 own a stable `clientSubmissionId` per submitted revision?
2. Option A or Option B for transporting the judge package?
3. Are `attemptId`, `assessmentItemId`, and revision fields correct for the M3 domain model?
4. Which output comparison rule(s) are supported, and which one is the default?
5. Is C++ compile failure represented as `CE`?
6. Should memory limit exceedance produce `MLE`, or map to an existing verdict while emitting a technical event?
7. What maximum source size/test count/package size is appropriate for the MVP?
8. How are service credentials and internal routing handled by M1?
9. What is the retention policy for source code and judge-package snapshots?
