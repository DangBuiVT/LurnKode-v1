/**
 * @file scripts/seed-assessment.ts
 * @description Local database seeder for development and testing.
 */

import { assessmentService } from "../src/services/assessment.service";

export const DEMO_ASSESSMENT_ID = "a0000000-0000-4000-8000-000000000001";
export const DEMO_MCQ_ITEM_ID = "b0000000-0000-4000-8000-000000000001";
export const DEMO_CODE_ITEM_ID = "c0000000-0000-4000-8000-000000000001";
export const DEMO_COURSE_ID = "c4b184f4-5df6-48b2-b5e2-2a7e7be28f11";

export async function seedAssessment() {
  const existing = await assessmentService.getAssessment(DEMO_ASSESSMENT_ID);
  if (existing) {
    return existing;
  }

  console.info("🌱 Seeding assessment data...");

  const assessment = await assessmentService.createAssessment({
    id: DEMO_ASSESSMENT_ID,
    courseId: DEMO_COURSE_ID,
    title: "Data Structures & Algorithms - Quiz 1",
    description: "Assessment on arrays, trees, and dynamic programming.",
    maxAttempts: 3,
    timeLimitSec: 3600,
  });

  await assessmentService.addItem(assessment.id, {
    id: DEMO_MCQ_ITEM_ID,
    type: "mcq",
    title: "Binary Search Complexity",
    prompt: "What is the worst-case time complexity of binary search?",
    points: 5,
    sortOrder: 1,
    difficulty: "easy",
    tags: ["dsa", "complexity"],
    mcqPayload: {
      mcqType: "single",
      options: [
        { id: "opt_1", text: "O(1)" },
        { id: "opt_2", text: "O(log n)" },
        { id: "opt_3", text: "O(n)" },
        { id: "opt_4", text: "O(n log n)" },
      ],
      correctOptionIds: ["opt_2"],
    },
  });

  await assessmentService.addItem(assessment.id, {
    id: DEMO_CODE_ITEM_ID,
    type: "programming",
    title: "Palindrome Checker",
    prompt: "Implement a function `is_palindrome(s: str) -> bool`.",
    points: 15,
    sortOrder: 2,
    difficulty: "medium",
    tags: ["python", "string"],
    programmingPayload: {
      language: "python",
      starterCode: "def is_palindrome(s: str) -> bool:\n    pass\n",
      limits: { cpu: 1, memoryMb: 128, timeoutMs: 3000 },
      hiddenTestCases: [
        { id: "tc_1", input: "racecar", expectedOutput: "True", hidden: false, weight: 1 },
        { id: "tc_2", input: "hello", expectedOutput: "False", hidden: true, weight: 1 },
        { id: "tc_3", input: "A man a plan a canal Panama", expectedOutput: "True", hidden: true, weight: 2 },
      ],
    },
  });

  const published = await assessmentService.publishAssessment(assessment.id);
  console.info(`✅ Seeded and published assessment: ${published.id}`);
  return published;
}

if (import.meta.main) {
  seedAssessment().catch(console.error);
}
