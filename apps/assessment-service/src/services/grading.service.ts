/**
 * @file services/grading.service.ts
 * @description Assessment Grading Service (M3 Microservice).
 *
 * Provides pure, deterministic grading engines for evaluating learner submissions.
 * This service contains no database queries, I/O, or network requests.
 * Evaluates inputs deterministically: grade(input, answerKey) -> { score, status }
 */

/**
 * Result structure returned by grading functions.
 */
export interface GradeResult {
  /** The calculated score for the response */
  score: number;
  /** Final status of the evaluated answer */
  status: "correct" | "incorrect";
}

/**
 * Grades Multiple Choice Questions (MCQ) for single or multiple selection.
 *
 * Rules:
 * - Empty selection yields 0 points and 'incorrect' status.
 * - Duplicate learner selections are deduplicated via Set.
 * - Exact set match between selected options and correct options awards full points.
 * - Missing any correct option or choosing any extra/incorrect option yields 0 points.
 *
 * @param selectedOptionIds - Array of option IDs selected by the learner
 * @param correctOptionIds - Array of correct option IDs from the answer key
 * @param points - Total maximum points assigned to this question item
 * @returns {GradeResult} Score and grading status ('correct' | 'incorrect')
 */
export function gradeMcq(
  selectedOptionIds: string[],
  correctOptionIds: string[],
  points: number
): GradeResult {
  const selectedSet = new Set(selectedOptionIds);
  const correctSet = new Set(correctOptionIds);

  // Defensive: an empty answer key must never award points for an empty selection.
  if (correctSet.size === 0) {
    return { score: 0, status: "incorrect" };
  }

  if (selectedSet.size !== correctSet.size) {
    return { score: 0, status: "incorrect" };
  }

  for (const option of selectedSet) {
    if (!correctSet.has(option)) {
      return { score: 0, status: "incorrect" };
    }
  }

  return { score: points, status: "correct" };
}

/**
 * Result status for an individual test case execution from the sandbox/judge.
 */
export type TestExecutionStatus =
  | "AC"  // Accepted / Passed
  | "WA"  // Wrong Answer
  | "TLE" // Time Limit Exceeded
  | "MLE" // Memory Limit Exceeded
  | "RE"  // Runtime Error
  | "CE"; // Compilation Error

/**
 * TestCase specification with weighting.
 */
export interface TestCaseSpec {
  id: string;
  weight: number;
  hidden?: boolean;
}

/**
 * Evaluated test case result reported by the sandbox/judge worker.
 */
export interface TestResultReport {
  testCaseId: string;
  status: TestExecutionStatus;
  executionMs?: number;
  message?: string;
  hidden?: boolean;
}

/**
 * Result of computing programming score.
 */
export interface ProgrammingGradingResult {
  /** Total score earned proportional to passed test case weights */
  score: number;
  /** Maximum attainable score */
  maxScore: number;
  /** Summary status: 'AC' if all tests pass, otherwise first failing status */
  finalStatus: TestExecutionStatus;
  /** Number of test cases that passed */
  passedTests: number;
  /** Total test cases evaluated */
  totalTests: number;
}

/**
 * Computes programming submission score based on weighted test case outcomes.
 *
 * Formula:
 * - Each test case has an assigned weight (defaults to 1 if not specified or <= 0).
 * - Total earned score = (sum of weights of passed 'AC' test cases / total weight) * maxPoints.
 * - Score is rounded to 2 decimal places.
 * - Returns 'AC' if and only if all test cases passed; otherwise returns first failed status.
 *
 * @param testSpecs - Array of test case specifications defining IDs and weights
 * @param executionResults - Array of test execution results from judge callback
 * @param maxPoints - Total maximum points for this programming item
 * @returns {ProgrammingGradingResult} Calculated programming score and status
 */
export function computeProgrammingScore(
  testSpecs: TestCaseSpec[],
  executionResults: TestResultReport[],
  maxPoints: number
): ProgrammingGradingResult {
  if (testSpecs.length === 0 || maxPoints <= 0) {
    return {
      score: 0,
      maxScore: maxPoints,
      finalStatus: "WA",
      passedTests: 0,
      totalTests: testSpecs.length,
    };
  }

  const resultMap = new Map<string, TestExecutionStatus>();
  for (const res of executionResults) {
    resultMap.set(res.testCaseId, res.status);
  }

  let totalWeight = 0;
  let earnedWeight = 0;
  let passedCount = 0;
  let firstFailureStatus: TestExecutionStatus | null = null;

  for (const spec of testSpecs) {
    const weight = spec.weight > 0 ? spec.weight : 1;
    totalWeight += weight;

    const status = resultMap.get(spec.id);
    if (status === "AC") {
      earnedWeight += weight;
      passedCount += 1;
    } else {
      if (!firstFailureStatus) {
        firstFailureStatus = status ?? "WA";
      }
    }
  }

  const rawScore = totalWeight > 0 ? (earnedWeight / totalWeight) * maxPoints : 0;
  const score = Math.round(rawScore * 100) / 100;
  const finalStatus: TestExecutionStatus =
    passedCount === testSpecs.length ? "AC" : (firstFailureStatus ?? "WA");

  return {
    score,
    maxScore: maxPoints,
    finalStatus,
    passedTests: passedCount,
    totalTests: testSpecs.length,
  };
}

