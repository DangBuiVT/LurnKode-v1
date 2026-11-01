import { describe, it, expect } from "bun:test";
import { validateSubmission, validIdempotencyKey } from "../../src/domain/validate";
import { clampLimits, POLICY } from "../../src/domain/limits";
import { canonicalHash } from "../../src/domain/hash";

const base = () => ({
  contractVersion: "1.0",
  clientSubmissionId: "f8a7e9fd-92f0-4c01-9f95-0a8d2c67f7d4",
  attemptId: "9d5c6a3e-20a5-47e2-b8a0-6c80e5adf5af",
  assessmentItemId: "ee62c89c-875e-4884-99b4-6f55db9f4b40",
  revision: 1,
  language: "python",
  sourceCode: "print(5)",
  judgePackage: {
    packageId: "math-sum-v3",
    version: 3,
    comparisonMode: "exact",
    testCases: [{ testCaseId: "tc-001", stdin: "2 3\n", expectedOutput: "5" }],
  },
});

describe("validateSubmission", () => {
  it("should accept a valid request", () => {
    const r = validateSubmission(base());
    expect(r.ok).toBe(true);
  });

  it("should reject non-object body with INVALID_REQUEST (400)", () => {
    const r = validateSubmission("nope");
    expect(r).toMatchObject({ ok: false, status: 400, code: "INVALID_REQUEST" });
  });

  it("should reject malformed UUID with INVALID_REQUEST", () => {
    const b = base();
    b.attemptId = "not-a-uuid";
    expect(validateSubmission(b)).toMatchObject({ ok: false, status: 400, code: "INVALID_REQUEST" });
  });

  it("should reject unsupported language with 422 UNSUPPORTED_LANGUAGE", () => {
    const b = base();
    b.language = "brainfuck";
    expect(validateSubmission(b)).toMatchObject({ ok: false, status: 422, code: "UNSUPPORTED_LANGUAGE" });
  });

  it("should reject source larger than 64KB with 413 PAYLOAD_TOO_LARGE", () => {
    const b = base();
    b.sourceCode = "a".repeat(64 * 1024 + 1);
    expect(validateSubmission(b)).toMatchObject({ ok: false, status: 413, code: "PAYLOAD_TOO_LARGE" });
  });

  it("should reject empty test case list with 422 INVALID_JUDGE_PACKAGE", () => {
    const b = base();
    b.judgePackage.testCases = [];
    expect(validateSubmission(b)).toMatchObject({ ok: false, status: 422, code: "INVALID_JUDGE_PACKAGE" });
  });

  it("should reject unknown comparison mode with 422 INVALID_JUDGE_PACKAGE", () => {
    const b = base();
    b.judgePackage.comparisonMode = "fuzzy";
    expect(validateSubmission(b)).toMatchObject({ ok: false, status: 422, code: "INVALID_JUDGE_PACKAGE" });
  });

  it("should reject too many test cases with 413 PAYLOAD_TOO_LARGE", () => {
    const b = base();
    b.judgePackage.testCases = Array.from({ length: POLICY.maxTestCases + 1 }, (_, i) => ({
      testCaseId: `t${i}`,
      stdin: "",
      expectedOutput: "",
    }));
    expect(validateSubmission(b)).toMatchObject({ ok: false, status: 413, code: "PAYLOAD_TOO_LARGE" });
  });

  it("should reject requested limits above policy with 422 LIMIT_EXCEEDS_POLICY", () => {
    const b = { ...base(), requestedRuntimeLimits: { cpuCores: 1, memoryLimitMb: 512, timeLimitMs: 3000 } };
    expect(validateSubmission(b)).toMatchObject({ ok: false, status: 422, code: "LIMIT_EXCEEDS_POLICY" });
  });

  it("should accept cpp language", () => {
    const b = base();
    b.language = "cpp";
    expect(validateSubmission(b).ok).toBe(true);
  });

  it("should accept public and hidden visibility on test cases", () => {
    const b: any = base();
    b.judgePackage.testCases = [
      { testCaseId: "a", stdin: "", expectedOutput: "", visibility: "public" },
      { testCaseId: "b", stdin: "", expectedOutput: "", visibility: "hidden" },
    ];
    expect(validateSubmission(b).ok).toBe(true);
  });

  it("should reject an unknown visibility with 422 INVALID_JUDGE_PACKAGE", () => {
    const b: any = base();
    b.judgePackage.testCases[0].visibility = "secret";
    expect(validateSubmission(b)).toMatchObject({ ok: false, status: 422, code: "INVALID_JUDGE_PACKAGE" });
  });
});

describe("validIdempotencyKey", () => {
  it("should accept a normal key", () => {
    expect(validIdempotencyKey("abc-123")).toBe(true);
  });
  it("should reject empty/missing/oversized keys", () => {
    expect(validIdempotencyKey("")).toBe(false);
    expect(validIdempotencyKey(null)).toBe(false);
    expect(validIdempotencyKey("x".repeat(201))).toBe(false);
  });
});

describe("clampLimits", () => {
  it("should use policy defaults when nothing is requested", () => {
    expect(clampLimits(undefined)).toEqual({ cpuCores: 1, memoryLimitMb: 128, timeLimitMs: 3000 });
  });
  it("should allow lowering limits", () => {
    expect(clampLimits({ memoryLimitMb: 64, timeLimitMs: 1000 })).toEqual({
      cpuCores: 1,
      memoryLimitMb: 64,
      timeLimitMs: 1000,
    });
  });
  it("should never exceed policy ceilings", () => {
    expect(clampLimits({ cpuCores: 8, memoryLimitMb: 9999, timeLimitMs: 99999 })).toEqual({
      cpuCores: 1,
      memoryLimitMb: 128,
      timeLimitMs: 3000,
    });
  });
});

describe("canonicalHash", () => {
  it("should be independent of object key order", () => {
    expect(canonicalHash({ a: 1, b: { c: 2, d: 3 } })).toBe(canonicalHash({ b: { d: 3, c: 2 }, a: 1 }));
  });
  it("should differ when content differs", () => {
    expect(canonicalHash({ a: 1 })).not.toBe(canonicalHash({ a: 2 }));
  });
  it("should be order-sensitive for arrays", () => {
    expect(canonicalHash([1, 2])).not.toBe(canonicalHash([2, 1]));
  });
});
