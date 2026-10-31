/**
 * @file services/assessment.service.ts
 * @description Core business logic for assessment authoring, publishing, and question banking.
 */

import { assessmentRepository, AssessmentRepository } from "../repositories/assessment.repository";
import { ServiceError } from "../middlewares/error.middleware";
import type { Assessment, AssessmentItem } from "../schemas/assessment.types";
import type { CreateAssessmentInput, CreateAssessmentItemInput } from "../schemas/assessment.zod";

export class AssessmentService {
  constructor(private repo: AssessmentRepository = assessmentRepository) {}

  async createAssessment(input: CreateAssessmentInput & { id?: string }): Promise<Assessment> {
    return this.repo.createAssessment({
      ...(input.id ? { id: input.id } : {}),
      courseId: input.courseId,
      title: input.title,
      description: input.description,
      status: "draft",
      maxAttempts: input.maxAttempts,
      timeLimitSec: input.timeLimitSec,
      publishedAt: null,
    });
  }

  async getAssessment(id: string): Promise<Assessment | null> {
    return this.repo.findAssessmentById(id);
  }

  async listAssessmentsByCourse(courseId: string): Promise<Assessment[]> {
    return this.repo.listAssessmentsByCourse(courseId);
  }

  async addItem(
    assessmentId: string,
    input: CreateAssessmentItemInput & { id?: string }
  ): Promise<AssessmentItem> {
    const assessment = await this.repo.findAssessmentById(assessmentId);
    if (!assessment) {
      throw new ServiceError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    }
    if (assessment.status !== "draft") {
      throw new ServiceError(
        409,
        "ASSESSMENT_NOT_EDITABLE",
        "Cannot add items to a published or archived assessment"
      );
    }

    if (input.type === "mcq") {
      return this.repo.createItem({
        ...(input.id ? { id: input.id } : {}),
        assessmentId,
        type: "mcq",
        title: input.title,
        prompt: input.prompt,
        points: input.points,
        sortOrder: input.sortOrder,
        difficulty: input.difficulty,
        tags: input.tags,
        mcqPayload: input.mcqPayload,
      });
    } else {
      return this.repo.createItem({
        ...(input.id ? { id: input.id } : {}),
        assessmentId,
        type: "programming",
        title: input.title,
        prompt: input.prompt,
        points: input.points,
        sortOrder: input.sortOrder,
        difficulty: input.difficulty,
        tags: input.tags,
        programmingPayload: input.programmingPayload,
      });
    }
  }

  async publishAssessment(id: string): Promise<Assessment> {
    const assessment = await this.repo.findAssessmentById(id);
    if (!assessment) {
      throw new ServiceError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found");
    }
    if (assessment.status === "published") return assessment;

    const items = await this.repo.listItemsByAssessmentId(id);
    if (items.length === 0) {
      throw new ServiceError(
        409,
        "ASSESSMENT_HAS_NO_ITEMS",
        "Cannot publish an assessment with zero questions"
      );
    }

    const updated = await this.repo.updateAssessment(id, {
      status: "published",
      publishedAt: new Date(),
    });
    if (!updated) {
      throw new ServiceError(500, "ASSESSMENT_UPDATE_FAILED", "Failed to update assessment status");
    }
    return updated;
  }
}

export const assessmentService = new AssessmentService();

