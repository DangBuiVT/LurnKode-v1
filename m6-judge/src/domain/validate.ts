import { COMPARISON_MODES, type ComparisonMode } from "./compare";
import { POLICY, type RuntimeLimits } from "./limits";

export const LANGUAGES = ["python", "cpp"] as const;
export type Language = (typeof LANGUAGES)[number];

export type TestVisibility = "public" | "hidden";

export interface TestCase {
  testCaseId: string;
  stdin: string;
  expectedOutput: string;
  /** Defaults to "hidden". Only "public" tests may be echoed back in results. */
  visibility?: TestVisibility;
}

export interface JudgePackage {
  packageId: string;
  version: number;
  comparisonMode: ComparisonMode;
  testCases: TestCase[];
}

export interface SubmissionRequest {
  contractVersion: string;
  clientSubmissionId: string;
  attemptId: string;
  assessmentItemId: string;
  revision: number;
  language: Language;
  sourceCode: string;
  judgePackage: JudgePackage;
  requestedRuntimeLimits?: Partial<RuntimeLimits>;
}

export type ValidationResult =
  | { ok: true; value: SubmissionRequest }
  | { ok: false; status: 400 | 413 | 422; code: string; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (status: 400 | 413 | 422, code: string, message: string): ValidationResult => ({
  ok: false,
  status,
  code,
  message,
});
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";

export function validIdempotencyKey(k: string | null | undefined): k is string {
  return typeof k === "string" && k.length > 0 && k.length <= 200;
}

/** Structural + policy validation. Error messages never echo submitted content. */
export function validateSubmission(body: unknown): ValidationResult {
  if (!isObj(body)) return fail(400, "INVALID_REQUEST", "Body must be a JSON object.");
  const b = body;
  if (b.contractVersion !== "1.0") return fail(400, "INVALID_REQUEST", "Unsupported contractVersion.");
  for (const f of ["clientSubmissionId", "attemptId", "assessmentItemId"] as const) {
    if (!isStr(b[f]) || !UUID.test(b[f] as string)) return fail(400, "INVALID_REQUEST", `${f} must be a UUID.`);
  }
  if (!Number.isInteger(b.revision) || (b.revision as number) < 1)
    return fail(400, "INVALID_REQUEST", "revision must be a positive integer.");
  if (!isStr(b.language) || !isStr(b.sourceCode)) return fail(400, "INVALID_REQUEST", "language and sourceCode are required.");
  if (!isObj(b.judgePackage)) return fail(400, "INVALID_REQUEST", "judgePackage is required.");

  if (!(LANGUAGES as readonly string[]).includes(b.language))
    return fail(422, "UNSUPPORTED_LANGUAGE", "The requested language is not supported.");
  if (Buffer.byteLength(b.sourceCode) > POLICY.maxSourceBytes)
    return fail(413, "PAYLOAD_TOO_LARGE", "Source code exceeds the maximum size.");

  const p = b.judgePackage;
  if (!isStr(p.packageId) || !Number.isInteger(p.version) || !Array.isArray(p.testCases))
    return fail(422, "INVALID_JUDGE_PACKAGE", "judgePackage is malformed.");
  if (!(COMPARISON_MODES as readonly string[]).includes(p.comparisonMode as string))
    return fail(422, "INVALID_JUDGE_PACKAGE", "Unknown comparisonMode.");
  if (p.testCases.length > POLICY.maxTestCases)
    return fail(413, "PAYLOAD_TOO_LARGE", "Too many test cases.");
  if (p.testCases.length === 0) return fail(422, "INVALID_JUDGE_PACKAGE", "At least one test case is required.");
  for (const t of p.testCases) {
    if (!isObj(t) || !isStr(t.testCaseId) || !isStr(t.stdin) || !isStr(t.expectedOutput))
      return fail(422, "INVALID_JUDGE_PACKAGE", "A test case is malformed.");
    if (t.visibility !== undefined && t.visibility !== "public" && t.visibility !== "hidden")
      return fail(422, "INVALID_JUDGE_PACKAGE", "A test case has an unknown visibility.");
  }
  if (Buffer.byteLength(JSON.stringify(p)) > POLICY.maxPackageBytes)
    return fail(413, "PAYLOAD_TOO_LARGE", "Judge package exceeds the maximum size.");

  const r = b.requestedRuntimeLimits;
  if (r !== undefined) {
    if (!isObj(r)) return fail(400, "INVALID_REQUEST", "requestedRuntimeLimits is malformed.");
    if (
      (r.cpuCores as number) > POLICY.cpuCores ||
      (r.memoryLimitMb as number) > POLICY.memoryLimitMb ||
      (r.timeLimitMs as number) > POLICY.timeLimitMs
    )
      return fail(422, "LIMIT_EXCEEDS_POLICY", "Requested limits exceed the service policy.");
  }
  return { ok: true, value: b as unknown as SubmissionRequest };
}
