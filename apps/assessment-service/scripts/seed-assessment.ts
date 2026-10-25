/**
 * @file scripts/seed-assessment.ts
 * @description Local database seeder for development and testing.
 */

import { assessmentService } from "../src/services/assessment.service";

async function seed() {
  console.info("🌱 Seeding assessment data...");

  const assessment = await assessmentService.createAssessment({
    courseId: "c4b184f4-5df6-48b2-b5e2-2a7e7be28f11",
    title: "Data Structures & Algorithms - Quiz 1",
    description: "Assessment on arrays, trees, and dynamic programming.",
    maxAttempts: 3,
    timeLimitSec: 3600,
  });

  await assessmentService.addItem(assessment.id, {
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

  await assessmentService.publishAssessment(assessment.id);
  console.info(`✅ Seeded and published assessment: ${assessment.id}`);
}

seed().catch(console.error);
