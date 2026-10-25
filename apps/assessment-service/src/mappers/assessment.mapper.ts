/**
 * @file mappers/assessment.mapper.ts
 * @description Safe data mappers separating Instructor and Learner views.
 *
 * Security Requirement:
 * Never expose hidden test cases, expected outputs, solutions, or MCQ answer keys to learners.
 */

import type { AssessmentItem, McqPayload, ProgrammingPayload } from "../schemas/assessment.types";

export interface LearnerSafeMcqPayload {
  mcqType: McqPayload["mcqType"];
  options: McqPayload["options"];
}

export interface LearnerSafeProgrammingPayload {
  language: ProgrammingPayload["language"];
  starterCode?: string;
  limits: ProgrammingPayload["limits"];
  sampleTestCases: Array<{ id: string; input: string; expectedOutput: string }>;
}

export interface LearnerSafeItem {
  id: string;
  assessmentId: string;
  type: AssessmentItem["type"];
  title: string;
  prompt: string;
  points: number;
  sortOrder: number;
  difficulty?: string;
  tags?: string[];
  mcqPayload?: LearnerSafeMcqPayload;
  programmingPayload?: LearnerSafeProgrammingPayload;
}

/**
 * Projects an AssessmentItem into a sanitized learner-safe view.
 */
export function mapItemForLearner(item: AssessmentItem): LearnerSafeItem {
  const safeItem: LearnerSafeItem = {
    id: item.id,
    assessmentId: item.assessmentId,
    type: item.type,
    title: item.title,
    prompt: item.prompt,
    points: item.points,
    sortOrder: item.sortOrder,
    difficulty: item.difficulty,
    tags: item.tags,
  };

  if (item.type === "mcq" && item.mcqPayload) {
    safeItem.mcqPayload = {
      mcqType: item.mcqPayload.mcqType,
      options: item.mcqPayload.options,
      // Strips correctOptionIds
    };
  } else if (item.type === "programming" && item.programmingPayload) {
    safeItem.programmingPayload = {
      language: item.programmingPayload.language,
      starterCode: item.programmingPayload.starterCode,
      limits: item.programmingPayload.limits,
      // Only include public non-hidden test cases if any
      sampleTestCases: item.programmingPayload.hiddenTestCases
        .filter((tc) => !tc.hidden)
        .map((tc) => ({ id: tc.id, input: tc.input, expectedOutput: tc.expectedOutput })),
      // Strips solution and hiddenTestCases
    };
  }

  return safeItem;
}

/**
 * Projects an AssessmentItem for instructor view (includes complete answer keys and solutions).
 */
export function mapItemForInstructor(item: AssessmentItem): AssessmentItem {
  return item;
}

