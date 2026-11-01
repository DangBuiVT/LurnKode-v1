/**
 * @file repositories/assessment.repository.ts
 * @description Dedicated Drizzle ORM repository for Assessment Microservice domain tables.
 */

import type {
  Assessment,
  AssessmentItem,
  Attempt,
  Answer,
  CodeSubmission,
  TestResult,
} from "../schemas/assessment.types";

export class AssessmentRepository {
  // In-memory backing store for local testing and initial scaffolding
  private assessments = new Map<string, Assessment>();
  private items = new Map<string, AssessmentItem>();
  private attempts = new Map<string, Attempt>();
  private answers = new Map<string, Answer>();
  private codeSubmissions = new Map<string, CodeSubmission>();
  private testResults = new Map<string, TestResult[]>();

  async createAssessment(
    data: Omit<Assessment, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ): Promise<Assessment> {
    const id = data.id ?? crypto.randomUUID();
    const assessment: Assessment = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assessments.set(id, assessment);
    return assessment;
  }

  async findAssessmentById(id: string): Promise<Assessment | null> {
    return this.assessments.get(id) ?? null;
  }

  async listAssessmentsByCourse(courseId: string): Promise<Assessment[]> {
    const cleanId = courseId.replace(/^c-/, "");
    return Array.from(this.assessments.values()).filter(
      (a) => a.courseId === courseId || a.courseId.replace(/^c-/, "") === cleanId || (cleanId === "dsa" && a.courseId === "c4b184f4-5df6-48b2-b5e2-2a7e7be28f11")
    );
  }

  async updateAssessment(id: string, patch: Partial<Assessment>): Promise<Assessment | null> {
    const existing = this.assessments.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.assessments.set(id, updated);
    return updated;
  }

  async createItem(
    data: Omit<AssessmentItem, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ): Promise<AssessmentItem> {
    const id = data.id ?? crypto.randomUUID();
    const item: AssessmentItem = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.set(id, item);
    return item;
  }

  async findItemById(id: string): Promise<AssessmentItem | null> {
    return this.items.get(id) ?? null;
  }

  async listItemsByAssessmentId(assessmentId: string): Promise<AssessmentItem[]> {
    return Array.from(this.items.values())
      .filter((i) => i.assessmentId === assessmentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findActiveAttempt(assessmentId: string, userId: string): Promise<Attempt | null> {
    return (
      Array.from(this.attempts.values()).find(
        (att) =>
          att.assessmentId === assessmentId &&
          att.userId === userId &&
          (att.status === "in_progress" || att.status === "submitted" || att.status === "grading")
      ) ?? null
    );
  }

  async countAttempts(assessmentId: string, userId: string): Promise<number> {
    return Array.from(this.attempts.values()).filter(
      (att) => att.assessmentId === assessmentId && att.userId === userId
    ).length;
  }

  async createAttempt(data: Omit<Attempt, "id" | "startedAt">): Promise<Attempt> {
    const id = crypto.randomUUID();
    const attempt: Attempt = {
      ...data,
      id,
      startedAt: new Date(),
    };
    this.attempts.set(id, attempt);
    return attempt;
  }

  async findAttemptById(id: string): Promise<Attempt | null> {
    return this.attempts.get(id) ?? null;
  }

  async updateAttempt(id: string, patch: Partial<Attempt>): Promise<Attempt | null> {
    const existing = this.attempts.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.attempts.set(id, updated);
    return updated;
  }

  async upsertAnswer(data: Omit<Answer, "id" | "createdAt">): Promise<Answer> {
    const existingKey = `${data.attemptId}_${data.itemId}`;
    const existing = Array.from(this.answers.values()).find(
      (a) => a.attemptId === data.attemptId && a.itemId === data.itemId
    );

    const answer: Answer = {
      ...data,
      id: existing ? existing.id : crypto.randomUUID(),
      createdAt: existing ? existing.createdAt : new Date(),
    };
    this.answers.set(existingKey, answer);
    return answer;
  }

  async listAnswersByAttemptId(attemptId: string): Promise<Answer[]> {
    return Array.from(this.answers.values()).filter((a) => a.attemptId === attemptId);
  }

  async createCodeSubmission(
    data: Omit<CodeSubmission, "id" | "createdAt" | "updatedAt">
  ): Promise<CodeSubmission> {
    const id = crypto.randomUUID();
    const submission: CodeSubmission = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.codeSubmissions.set(id, submission);
    return submission;
  }

  async findCodeSubmissionById(id: string): Promise<CodeSubmission | null> {
    return this.codeSubmissions.get(id) ?? null;
  }

  async listCodeSubmissionsByAttemptId(attemptId: string): Promise<CodeSubmission[]> {
    return Array.from(this.codeSubmissions.values())
      .filter((submission) => submission.attemptId === attemptId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateCodeSubmission(
    id: string,
    patch: Partial<CodeSubmission>
  ): Promise<CodeSubmission | null> {
    const existing = this.codeSubmissions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.codeSubmissions.set(id, updated);
    return updated;
  }

  async insertTestResults(
    submissionId: string,
    results: Array<Omit<TestResult, "id" | "codeSubmissionId">>
  ): Promise<TestResult[]> {
    const saved: TestResult[] = results.map((r) => ({
      ...r,
      id: crypto.randomUUID(),
      codeSubmissionId: submissionId,
    }));
    this.testResults.set(submissionId, saved);
    return saved;
  }

  async findTestResultsBySubmissionId(submissionId: string): Promise<TestResult[]> {
    return this.testResults.get(submissionId) ?? [];
  }
}

export const assessmentRepository = new AssessmentRepository();

