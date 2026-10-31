/**
 * @file scripts/fake-judge.ts
 * @description Local development and mock harness simulating the M6 Judge Worker.
 *
 * Responsibilities:
 * - Dequeue evaluation jobs dispatched by M3 queue.service.
 * - Simulate sandbox execution: execute code or simulate pass/fail/timeout verdicts.
 * - Send signed/authenticated HTTP callback payloads to M3 internal judge routes.
 * - Enable full end-to-end testing of asynchronous code submission pipelines without external M6 containers.
 */

import { env } from "../src/config/env";

export interface SimulateJudgeOptions {
  serviceUrl?: string;
  internalToken?: string;
  submissionId: string;
  testCaseIds?: string[];
  verdict?: "AC" | "WA" | "TLE" | "MLE" | "RE" | "RTE" | "CE";
  error?: string | null;
}

export async function simulateJudgeCallback(
  serviceUrlOrOptions: string | SimulateJudgeOptions,
  maybeToken?: string,
  maybeSubmissionId?: string,
  maybeTestCaseIds?: string[]
) {
  let serviceUrl = `http://localhost:${env.PORT}`;
  let internalToken = env.INTERNAL_SERVICE_TOKEN;
  let submissionId = "";
  let testCaseIds = ["tc_1", "tc_2", "tc_3"];
  let verdict: "AC" | "WA" | "TLE" | "MLE" | "RE" | "RTE" | "CE" = "AC";
  let error: string | null = null;

  if (typeof serviceUrlOrOptions === "object") {
    if (serviceUrlOrOptions.serviceUrl) serviceUrl = serviceUrlOrOptions.serviceUrl;
    if (serviceUrlOrOptions.internalToken) internalToken = serviceUrlOrOptions.internalToken;
    submissionId = serviceUrlOrOptions.submissionId;
    if (serviceUrlOrOptions.testCaseIds) testCaseIds = serviceUrlOrOptions.testCaseIds;
    if (serviceUrlOrOptions.verdict) verdict = serviceUrlOrOptions.verdict;
    if (serviceUrlOrOptions.error) error = serviceUrlOrOptions.error;
  } else {
    serviceUrl = serviceUrlOrOptions;
    if (maybeToken) internalToken = maybeToken;
    if (maybeSubmissionId) submissionId = maybeSubmissionId;
    if (maybeTestCaseIds) testCaseIds = maybeTestCaseIds;
  }

  const isFailed = Boolean(error);

  const payload = isFailed
    ? {
        submissionId,
        judgeJobId: `mock_job_${Date.now()}`,
        status: "failed" as const,
        error: error ?? "Judge execution worker failure",
        executionMs: 0,
        memoryKb: 0,
        testResults: [],
      }
    : {
        submissionId,
        judgeJobId: `mock_job_${Date.now()}`,
        status: "completed" as const,
        finalStatus: verdict,
        executionMs: 85,
        memoryKb: 4096,
        error: null,
        testResults: testCaseIds.map((id, index) => ({
          testCaseId: id,
          status: verdict === "WA" && index > 0 ? ("WA" as const) : verdict,
          executionMs: 40,
          message: verdict === "WA" && index > 0 ? "Output mismatch: expected True, got False" : null,
          hidden: index > 0,
        })),
      };

  console.info(
    `[Fake Judge] Sending callback for submission ${submissionId} (status: ${payload.status}, verdict: ${isFailed ? "none" : verdict})...`
  );

  const res = await fetch(`${serviceUrl}/internal/judge/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": internalToken,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = await res.json().catch(() => null);

  if (!res.ok) {
    console.error(`[Fake Judge] Failed (HTTP ${res.status}):`, responseJson);
    return { ok: false, status: res.status, data: responseJson };
  }

  console.info(`[Fake Judge] Callback accepted by M3:`, JSON.stringify(responseJson, null, 2));
  return { ok: true, status: res.status, data: responseJson };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const submissionId = args[0];

  if (!submissionId || submissionId === "--help" || submissionId === "-h") {
    console.log(`
LurnKode Fake Judge CLI (Simulates M6 Worker Callback)

Usage:
  bun run fake-judge <submissionId> [verdict]
  bun run fake-judge <submissionId> --fail

Options:
  verdict   AC (default) | WA | TLE | MLE | RE | RTE | CE
  --fail    Simulate worker execution crash

Examples:
  bun run fake-judge 6ad1b75d-9057-49c1-af38-b66b79caee7c
  bun run fake-judge 6ad1b75d-9057-49c1-af38-b66b79caee7c WA
  bun run fake-judge 6ad1b75d-9057-49c1-af38-b66b79caee7c --fail
`);
    process.exit(submissionId ? 0 : 1);
  }

  const isFail = args.includes("--fail");
  const verdictArg = args[1] && !args[1].startsWith("--") ? (args[1].toUpperCase() as any) : "AC";

  await simulateJudgeCallback({
    submissionId,
    verdict: verdictArg,
    error: isFail ? "Sandbox execution timeout or worker killed" : null,
  });
}
