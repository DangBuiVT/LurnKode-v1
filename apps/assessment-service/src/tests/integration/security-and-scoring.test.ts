import { describe, it, expect } from "vitest";
import { app } from "../../app";
import { assessmentRepository } from "../../repositories/assessment.repository";

const INTERNAL_TOKEN = "m3-internal-secret-token";

const instructorHeaders = {
  "x-user-id": "instructor_http_test",
  "x-user-role": "instructor",
};

const learnerHeaders = (userId: string) => ({
  "x-user-id": userId,
  "x-user-role": "learner",
});

interface HttpResult {
  status: number;
  body: any;
}

async function call(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<HttpResult> {
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(options.headers ?? {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  );

  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text
  }

  return { status: response.status, body };
}

async function createPublishedAssessment(options: {
  suffix: string;
  withProgramming?: boolean;
}): Promise<{ assessmentId: string; mcqId?: string; programmingId?: string }> {
  const created = await call("POST", "/instructor/assessments", {
    headers: instructorHeaders,
    body: {
      courseId: `course_${options.suffix}`,
      title: `Exam ${options.suffix}`,
      maxAttempts: 3,
    },
  });
  expect(created.status).toBe(201);
  const assessmentId = created.body.id as string;

  const mcq = await call("POST", `/instructor/assessments/${assessmentId}/items`, {
    headers: instructorHeaders,
    body: {
      type: "mcq",
      title: "Complexity",
      prompt: "What is O(log n)?",
      points: 10,
      sortOrder: 1,
      mcqPayload: {
        mcqType: "single",
        options: [
          { id: "o1", text: "Linear" },
          { id: "o2", text: "Logarithmic" },
        ],
        correctOptionIds: ["o2"],
      },
    },
  });
  expect(mcq.status).toBe(201);

  let programmingId: string | undefined;
  if (options.withProgramming) {
    const programming = await call("POST", `/instructor/assessments/${assessmentId}/items`, {
      headers: instructorHeaders,
      body: {
        type: "programming",
        title: "Palindrome",
        prompt: "Write is_palindrome",
        points: 20,
        sortOrder: 2,
        programmingPayload: {
          language: "python",
          starterCode: "def is_palindrome(s):\n    pass\n",
          solution: "TOP_SECRET",
          limits: { cpu: 1, memoryMb: 128, timeoutMs: 3000 },
          hiddenTestCases: [
            { id: "tc_1", input: "racecar", expectedOutput: "True", hidden: true, weight: 1 },
            { id: "tc_2", input: "hello", expectedOutput: "False", hidden: true, weight: 1 },
          ],
        },
      },
    });
    expect(programming.status).toBe(201);
    programmingId = programming.body.id;
  }

  const published = await call("POST", `/instructor/assessments/${assessmentId}/publish`, {
    headers: instructorHeaders,
  });
  expect(published.status).toBe(200);

  return { assessmentId, mcqId: mcq.body.id, programmingId };
}

async function startAttempt(assessmentId: string, userId: string): Promise<string> {
  const started = await call("POST", `/learner/assessments/${assessmentId}/attempts`, {
    headers: learnerHeaders(userId),
  });
  expect(started.status).toBe(201);
  return started.body.attempt.id as string;
}

function callbackBody(submissionId: string, testCaseIds: string[]) {
  return {
    submissionId,
    status: "completed",
    finalStatus: "AC",
    executionMs: 20,
    memoryKb: 1024,
    testResults: testCaseIds.map((testCaseId) => ({
      testCaseId,
      status: "AC",
      executionMs: 10,
      hidden: true,
    })),
  };
}

describe("HTTP security", () => {
  it("rejects instructor routes without identity", async () => {
    const res = await call("POST", "/instructor/assessments", {
      body: { courseId: "course_no_auth", title: "No Auth" },
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/identity/i);
  });

  it("rejects learner role on instructor routes", async () => {
    const res = await call("POST", "/instructor/assessments", {
      headers: learnerHeaders("learner_escalation"),
      body: { courseId: "course_escalation", title: "Escalation" },
    });

    expect(res.status).toBe(403);
  });

  it("rejects learner routes without identity", async () => {
    const res = await call("POST", "/learner/assessments/some-id/attempts");
    expect(res.status).toBe(401);
  });

  it("keeps the internal callback protected", async () => {
    const res = await call("POST", "/internal/judge/callback", {
      body: callbackBody("unknown", ["tc_1"]),
    });

    expect(res.status).toBe(401);
  });
});

describe("Attempt scoring and lifecycle", () => {
  it("propagates programming scores into the attempt and rejects a second finish", async () => {
    const { assessmentId, mcqId, programmingId } = await createPublishedAssessment({
      suffix: `score_${Date.now()}`,
      withProgramming: true,
    });
    const userId = `user_score_${Date.now()}`;
    const attemptId = await startAttempt(assessmentId, userId);

    const answer = await call("POST", `/learner/attempts/${attemptId}/answers`, {
      headers: learnerHeaders(userId),
      body: { itemId: mcqId, selectedOptionIds: ["o2"] },
    });
    expect(answer.status).toBe(200);
    expect(answer.body.score).toBe(10);

    const submitted = await call("POST", `/learner/attempts/${attemptId}/code-submissions`, {
      headers: learnerHeaders(userId),
      body: { itemId: programmingId, language: "python", sourceCode: "def is_palindrome(s): return True" },
    });
    expect(submitted.status).toBe(202);

    const callback = await call("POST", "/internal/judge/callback", {
      headers: { "x-internal-token": INTERNAL_TOKEN },
      body: callbackBody(submitted.body.id, ["tc_1", "tc_2"]),
    });
    expect(callback.status).toBe(200);

    const finished = await call("POST", `/learner/attempts/${attemptId}/finish`, {
      headers: learnerHeaders(userId),
    });
    expect(finished.status).toBe(200);
    expect(finished.body.status).toBe("completed");
    expect(finished.body.score).toBe(30);
    expect(finished.body.maxScore).toBe(30);

    const secondFinish = await call("POST", `/learner/attempts/${attemptId}/finish`, {
      headers: learnerHeaders(userId),
    });
    expect(secondFinish.status).toBe(409);
  });

  it("moves to grading while a judge job is pending, then completes on callback", async () => {
    const { assessmentId, mcqId, programmingId } = await createPublishedAssessment({
      suffix: `pending_${Date.now()}`,
      withProgramming: true,
    });
    const userId = `user_pending_${Date.now()}`;
    const attemptId = await startAttempt(assessmentId, userId);

    await call("POST", `/learner/attempts/${attemptId}/answers`, {
      headers: learnerHeaders(userId),
      body: { itemId: mcqId, selectedOptionIds: ["o2"] },
    });

    const submitted = await call("POST", `/learner/attempts/${attemptId}/code-submissions`, {
      headers: learnerHeaders(userId),
      body: { itemId: programmingId, language: "python", sourceCode: "print(1)" },
    });
    expect(submitted.status).toBe(202);

    const finished = await call("POST", `/learner/attempts/${attemptId}/finish`, {
      headers: learnerHeaders(userId),
    });
    expect(finished.status).toBe(200);
    expect(finished.body.status).toBe("grading");
    expect(finished.body.score).toBe(10);

    const callback = await call("POST", "/internal/judge/callback", {
      headers: { "x-internal-token": INTERNAL_TOKEN },
      body: callbackBody(submitted.body.id, ["tc_1", "tc_2"]),
    });
    expect(callback.status).toBe(200);

    const attempt = await assessmentRepository.findAttemptById(attemptId);
    expect(attempt?.status).toBe("completed");
    expect(attempt?.score).toBe(30);
    expect(attempt?.completedAt).toBeTruthy();
  });

  it("rejects a submission in a language the item does not use", async () => {
    const { assessmentId, programmingId } = await createPublishedAssessment({
      suffix: `lang_${Date.now()}`,
      withProgramming: true,
    });
    const userId = `user_lang_${Date.now()}`;
    const attemptId = await startAttempt(assessmentId, userId);

    const res = await call("POST", `/learner/attempts/${attemptId}/code-submissions`, {
      headers: learnerHeaders(userId),
      body: { itemId: programmingId, language: "javascript", sourceCode: "console.log(1)" },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expects 'python'/i);
  });

  it("returns 404 for an unknown submission and 400 for unknown test cases", async () => {
    const unknown = await call("POST", "/internal/judge/callback", {
      headers: { "x-internal-token": INTERNAL_TOKEN },
      body: callbackBody("submission_does_not_exist", ["tc_1"]),
    });
    expect(unknown.status).toBe(404);

    const { assessmentId, programmingId } = await createPublishedAssessment({
      suffix: `callback_${Date.now()}`,
      withProgramming: true,
    });
    const userId = `user_callback_${Date.now()}`;
    const attemptId = await startAttempt(assessmentId, userId);
    const submitted = await call("POST", `/learner/attempts/${attemptId}/code-submissions`, {
      headers: learnerHeaders(userId),
      body: { itemId: programmingId, language: "python", sourceCode: "print(1)" },
    });

    const badTestCase = await call("POST", "/internal/judge/callback", {
      headers: { "x-internal-token": INTERNAL_TOKEN },
      body: callbackBody(submitted.body.id, ["tc_not_in_item"]),
    });
    expect(badTestCase.status).toBe(400);
    expect(badTestCase.body.details.unknownTestCaseIds).toEqual(["tc_not_in_item"]);

    const submission = await assessmentRepository.findCodeSubmissionById(submitted.body.id);
    expect(submission?.status).toBe("queued");
  });
});
