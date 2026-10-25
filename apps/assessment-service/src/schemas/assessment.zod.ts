import { z } from "zod";

/**
 * Common primitives
 */
export const uuidSchema = z.string().uuid();

export const assessmentStatusSchema = z.enum(["draft", "published", "archived"]);
export const assessmentItemTypeSchema = z.enum(["mcq", "programming"]);
export const mcqSelectionTypeSchema = z.enum(["single", "multiple"]);
export const attemptStatusSchema = z.enum(["in_progress", "submitted", "grading", "completed", "failed"]);
export const judgeVerdictSchema = z.enum(["AC", "WA", "TLE", "MLE", "RE", "CE"]);

/**
 * MCQ payload schema
 */
export const mcqOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const mcqPayloadSchema = z.object({
  mcqType: mcqSelectionTypeSchema,
  options: z.array(mcqOptionSchema).min(2),
  correctOptionIds: z.array(z.string().min(1)).min(1),
});

/**
 * Programming payload schema
 */
export const testCaseSchema = z.object({
  id: z.string().min(1),
  input: z.string(),
  expectedOutput: z.string(),
  hidden: z.boolean().default(true),
  weight: z.number().positive().default(1),
});

export const executionLimitsSchema = z.object({
  cpu: z.number().positive().default(1),
  memoryMb: z.number().positive().default(128),
  timeoutMs: z.number().positive().default(3000),
});

export const programmingPayloadSchema = z.object({
  language: z.enum(["python", "javascript", "typescript"]),
  starterCode: z.string().optional(),
  solution: z.string().optional(),
  hiddenTestCases: z.array(testCaseSchema).min(1),
  limits: executionLimitsSchema.default({ cpu: 1, memoryMb: 128, timeoutMs: 3000 }),
});

/**
 * Request Schemas: Instructor
 */
export const createAssessmentSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  maxAttempts: z.number().int().positive().default(3),
  timeLimitSec: z.number().int().positive().optional(),
});

export const updateAssessmentSchema = createAssessmentSchema.partial();

export const createAssessmentItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcq"),
    title: z.string().min(3).max(255),
    prompt: z.string().min(1),
    points: z.number().positive(),
    sortOrder: z.number().int().nonnegative().default(0),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    tags: z.array(z.string()).optional(),
    mcqPayload: mcqPayloadSchema,
  }),
  z.object({
    type: z.literal("programming"),
    title: z.string().min(3).max(255),
    prompt: z.string().min(1),
    points: z.number().positive(),
    sortOrder: z.number().int().nonnegative().default(0),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    tags: z.array(z.string()).optional(),
    programmingPayload: programmingPayloadSchema,
  }),
]);

/**
 * Request Schemas: Learner
 */
export const submitMcqAnswerSchema = z.object({
  itemId: z.string().min(1),
  selectedOptionIds: z.array(z.string().min(1)),
});

export const submitCodeSchema = z.object({
  itemId: z.string().min(1),
  language: z.enum(["python", "javascript", "typescript"]),
  sourceCode: z.string().min(1),
});

/**
 * Inter-Service Contracts
 */
export const judgeCallbackSchema = z.object({
  submissionId: z.string().min(1),
  judgeJobId: z.string().optional().nullable(),
  status: z.enum(["completed", "failed"]),
  finalStatus: judgeVerdictSchema.optional(),
  error: z.string().optional().nullable(),
  executionMs: z.number().nonnegative().default(0),
  memoryKb: z.number().nonnegative().default(0),
  testResults: z
    .array(
      z.object({
        testCaseId: z.string().min(1),
        status: judgeVerdictSchema,
        executionMs: z.number().nonnegative().default(0),
        message: z.string().optional().nullable(),
        hidden: z.boolean().default(true),
      })
    )
    .default([]),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
export type CreateAssessmentItemInput = z.infer<typeof createAssessmentItemSchema>;
export type SubmitMcqAnswerInput = z.infer<typeof submitMcqAnswerSchema>;
export type SubmitCodeInput = z.infer<typeof submitCodeSchema>;
export type JudgeCallbackInput = z.infer<typeof judgeCallbackSchema>;

