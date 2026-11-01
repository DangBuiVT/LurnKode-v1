import postgres from "postgres";
import { migrate } from "../../src/db/migrate";
import type { SubmissionRequest } from "../../src/domain/validate";

export const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://judge:judge@localhost:5432/judge";
export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export async function testSql() {
  const sql = postgres(DATABASE_URL, { max: Number(process.env.PG_MAX ?? 10), onnotice: () => {} });
  await migrate(sql);
  return sql;
}

export async function resetDb(sql: postgres.Sql) {
  await sql`TRUNCATE judge_events, judge_outbox, judge_results, judge_payload_snapshots, judge_submissions RESTART IDENTITY CASCADE`;
}

export function uuid() {
  return crypto.randomUUID();
}

export function makeRequest(over: Partial<SubmissionRequest> = {}): SubmissionRequest {
  return {
    contractVersion: "1.0",
    clientSubmissionId: uuid(),
    attemptId: uuid(),
    assessmentItemId: uuid(),
    revision: 1,
    language: "python",
    sourceCode: "print(5)",
    judgePackage: {
      packageId: "math-sum-v3",
      version: 3,
      comparisonMode: "exact",
      testCases: [{ testCaseId: "tc-001", stdin: "2 3\n", expectedOutput: "5" }],
    },
    ...over,
  };
}
