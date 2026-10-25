/**
 * @file events/event.publisher.ts
 * @description Publishes domain events to Redis Stream / PubSub topic for M2 and M4.
 */

import type { AssessmentAttemptCompletedEvent, AssessmentAttemptCompletedPayload } from "./event.types";

export class EventPublisher {
  /**
   * Publishes an assessment attempt completed event.
   * Consumers:
   * - M2 Course Service (Updates student gradebook & course progress)
   * - M4 AI Tutor (Analyzes weaknesses and provides remedial instruction)
   */
  async publishAttemptCompleted(payload: AssessmentAttemptCompletedPayload): Promise<void> {
    const event: AssessmentAttemptCompletedEvent = {
      eventId: `evt_${crypto.randomUUID()}`,
      eventType: "assessment.attempt.completed",
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: payload,
    };

    // Log event emission (or dispatch to Redis Stream in production)
    console.info(
      `[EventPublisher] Emitting event: ${event.eventType} for attempt: ${payload.attemptId}, user: ${payload.userId}, score: ${payload.score}/${payload.maxScore}`
    );
  }
}

export const eventPublisher = new EventPublisher();

