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

export async function simulateJudgeCallback(
  serviceUrl: string,
  internalToken: string,
  submissionId: string,
  testCaseIds: string[]
) {
  const payload = {
    submissionId,
    judgeJobId: `mock_job_${Date.now()}`,
    status: "completed",
    finalStatus: "AC",
    executionMs: 85,
    memoryKb: 4096,
    error: null,
    testResults: testCaseIds.map((id) => ({
      testCaseId: id,
      status: "AC",
      executionMs: 40,
      message: null,
      hidden: true,
    })),
  };

  const res = await fetch(`${serviceUrl}/internal/judge/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": internalToken,
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}
