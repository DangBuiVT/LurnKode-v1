import { describe, it, expect } from "vitest";
import { assessmentService } from "../../services/assessment.service";
import { attemptService } from "../../services/attempt.service";
import { callbackService } from "../../services/callback.service";

describe("Assessment Microservice Integration", () => {
  it("completes full attempt lifecycle end-to-end", async () => {
    // 1. Instructor creates assessment
    const assessment = await assessmentService.createAssessment({
      courseId: "course_uuid_123",
      title: "Midterm Exam 2026",
      maxAttempts: 2,
    });
    expect(assessment.id).toBeDefined();
    expect(assessment.status).toBe("draft");

    // 2. Instructor adds MCQ question
    const mcqItem = await assessmentService.addItem(assessment.id, {
      type: "mcq",
      title: "Complexity Question",
      prompt: "What is the time complexity of quicksort average case?",
      points: 10,
      sortOrder: 1,
      mcqPayload: {
        mcqType: "single",
        options: [
          { id: "opt_1", text: "O(n log n)" },
          { id: "opt_2", text: "O(n^2)" },
        ],
        correctOptionIds: ["opt_1"],
      },
    });
    expect(mcqItem.id).toBeDefined();

    // 3. Instructor publishes assessment
    const published = await assessmentService.publishAssessment(assessment.id);
    expect(published.status).toBe("published");

    // 4. Learner starts attempt (mocked M2 enrollment in development mode)
    const { attempt, items } = await attemptService.startAttempt(assessment.id, "learner_uuid_999");
    expect(attempt.id).toBeDefined();
    expect(attempt.status).toBe("in_progress");
    expect(attempt.maxScore).toBe(10);
    // Ensure answers are NOT leaked to learner
    expect((items[0]?.mcqPayload as any)?.correctOptionIds).toBeUndefined();

    // 5. Learner submits MCQ answer
    const answer = await attemptService.submitMcqAnswer(
      attempt.id,
      "learner_uuid_999",
      mcqItem.id,
      ["opt_1"]
    );
    expect(answer.score).toBe(10);
    expect(answer.status).toBe("correct");

    // 6. Learner finishes attempt
    const finished = await attemptService.finishAttempt(attempt.id, "learner_uuid_999");
    expect(finished.status).toBe("completed");
    expect(finished.score).toBe(10);
  });

  it("safely ignores duplicate callbacks idempotently", async () => {
    // Add programming item
    const assessment = await assessmentService.createAssessment({
      courseId: "course_uuid_123",
      title: "Coding Exam",
      maxAttempts: 3,
    });
    const progItem = await assessmentService.addItem(assessment.id, {
      type: "programming",
      title: "Two Sum",
      prompt: "Write two sum in Python",
      points: 20,
      sortOrder: 1,
      programmingPayload: {
        language: "python",
        limits: { cpu: 1, memoryMb: 128, timeoutMs: 3000 },
        hiddenTestCases: [{ id: "tc_1", input: "1 2", expectedOutput: "3", hidden: true, weight: 1 }],
      },
    });
    await assessmentService.publishAssessment(assessment.id);

    const { attempt } = await attemptService.startAttempt(assessment.id, "learner_uuid_100");
    const submission = await attemptService.submitCode(
      attempt.id,
      "learner_uuid_100",
      progItem.id,
      "python",
      "def solution(): pass"
    );

    // Initial callback
    const res1 = await callbackService.processJudgeCallback({
      submissionId: submission.id,
      status: "completed",
      finalStatus: "AC",
      executionMs: 15,
      memoryKb: 2048,
      testResults: [{ testCaseId: "tc_1", status: "AC", executionMs: 15, hidden: true }],
    });
    expect(res1.idempotent).toBe(false);
    expect(res1.submission.status).toBe("judged");
    expect(res1.submission.score).toBe(20);

    // Duplicate callback with same submissionId
    const res2 = await callbackService.processJudgeCallback({
      submissionId: submission.id,
      status: "completed",
      finalStatus: "AC",
      executionMs: 15,
      memoryKb: 2048,
      testResults: [{ testCaseId: "tc_1", status: "AC", executionMs: 15, hidden: true }],
    });
    expect(res2.idempotent).toBe(true);
  });
});

