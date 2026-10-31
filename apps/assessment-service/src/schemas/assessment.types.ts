/**
 * @file assessment.types.ts
 * @description Domain TypeScript types and interfaces for the M3 Assessment Microservice.
 *
 * Microservice Note:
 * Cross-boundary references (courseId, userId) are stored as string UUIDs
 * without physical foreign key constraints into external databases (M1, M2).
 */

export type AssessmentStatus = "draft" | "published" | "archived";
export type AssessmentItemType = "mcq" | "programming";
export type McqSelectionType = "single" | "multiple";
export type AttemptStatus = "in_progress" | "submitted" | "grading" | "completed" | "failed";
export type CodeSubmissionStatus = "queued" | "running" | "judged" | "failed";
export type JudgeVerdict = "AC" | "WA" | "TLE" | "MLE" | "RE" | "RTE" | "CE";
export type McqAnswerStatus = "correct" | "incorrect";

export interface McqOption {
  id: string;
  text: string;
}

export interface McqPayload {
  mcqType: McqSelectionType;
  options: McqOption[];
  correctOptionIds: string[]; // Protected: never exposed to learner
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
  weight: number;
}

export interface ExecutionLimits {
  cpu: number;        // e.g. 1
  memoryMb: number;   // e.g. 128
  timeoutMs: number;  // e.g. 3000
}

export interface ProgrammingPayload {
  language: "python" | "javascript" | "typescript";
  starterCode?: string;
  solution?: string; // Protected: never exposed to learner
  hiddenTestCases: TestCase[]; // Protected: never exposed to learner
  limits: ExecutionLimits;
}

export interface Assessment {
  id: string;
  courseId: string; // Logical reference to M2 Course
  title: string;
  description?: string;
  status: AssessmentStatus;
  maxAttempts: number;
  timeLimitSec?: number;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentItem {
  id: string;
  assessmentId: string;
  type: AssessmentItemType;
  title: string;
  prompt: string;
  points: number;
  sortOrder: number;
  difficulty?: "easy" | "medium" | "hard";
  tags?: string[];
  mcqPayload?: McqPayload;
  programmingPayload?: ProgrammingPayload;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attempt {
  id: string;
  assessmentId: string;
  userId: string; // Logical reference to M1 User
  status: AttemptStatus;
  score: number;
  maxScore: number;
  startedAt: Date;
  submittedAt?: Date | null;
  completedAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface Answer {
  id: string;
  attemptId: string;
  itemId: string;
  selectedOptionIds: string[];
  score: number;
  maxScore: number;
  status: McqAnswerStatus;
  createdAt: Date;
}

export interface CodeSubmission {
  id: string;
  attemptId: string;
  itemId: string;
  language: string;
  sourceCode: string;
  status: CodeSubmissionStatus;
  judgeJobId?: string | null;
  finalStatus?: JudgeVerdict | null;
  score: number;
  maxScore: number;
  executionMs?: number;
  memoryKb?: number;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestResult {
  id: string;
  codeSubmissionId: string;
  testCaseId: string;
  status: JudgeVerdict;
  executionMs: number;
  message?: string | null;
  hidden: boolean;
}

