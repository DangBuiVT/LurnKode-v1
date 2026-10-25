/**
 * @file events/event.types.ts
 * @description Domain event contracts emitted by the Assessment Microservice.
 */

export interface BaseDomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  timestamp: string;
  version: string;
  data: T;
}

export interface ItemGradingSummary {
  itemId: string;
  type: "mcq" | "programming";
  score: number;
  maxScore: number;
  finalStatus?: string;
}

export interface AssessmentAttemptCompletedPayload {
  attemptId: string;
  assessmentId: string;
  courseId: string;
  userId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
  breakdown: ItemGradingSummary[];
}

export type AssessmentAttemptCompletedEvent = BaseDomainEvent<AssessmentAttemptCompletedPayload>;

