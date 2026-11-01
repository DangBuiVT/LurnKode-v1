import type { CourseAnswer } from "../src/services/answerService.ts";
import type { RetrievedChunk } from "../src/domain/retrieval.ts";

export interface DemoCase {
  name: string;
  question: string;
  expectedStatus: CourseAnswer["status"];
  expectedTopic?: string;
  expectation: string;
}

export const DEMO_CASES: readonly DemoCase[] = [
  {
    name: "Direct Course-Grounded Question",
    question: "Trong Python, biến là gì? Giải thích ý nghĩa của phép gán x = 10.",
    expectedStatus: "answered", expectedTopic: "Variables and assignment",
    expectation: "Explain names, objects and assignment using course evidence; return valid citations.",
  },
  {
    name: "Semantic Retrieval / Paraphrased Question",
    question: "Tại sao giá trị của một biến Python có thể thay đổi trong quá trình chương trình chạy?",
    expectedStatus: "answered", expectedTopic: "Variables and assignment",
    expectation: "Explain rebinding or updates using course evidence; return valid citations.",
  },
  {
    name: "Out-of-Scope Question",
    question: "Ai sẽ vô địch World Cup bóng đá năm 2030?",
    expectedStatus: "out_of_scope",
    expectation: "Refuse the unsupported question and return zero citations.",
  },
  {
    name: "Course-Related but Unsupported Question",
    question: "Theo tài liệu này, Python 4.0 sẽ được phát hành vào ngày nào?",
    expectedStatus: "out_of_scope",
    expectation: "Refuse because the material supplies no release date; return zero citations.",
  },
];

export function verifyDemoCitations(result: CourseAnswer, hits: readonly RetrievedChunk[]): boolean {
  if (result.status === "answered" && result.citations.length === 0) return false;
  if (result.status === "out_of_scope" && result.citations.length !== 0) return false;
  return result.citations.every(citation => {
    const hit = hits.find(hit => hit.id === citation.chunkId);
    return hit !== undefined && citation.courseId === result.courseId && citation.courseId === hit.courseId &&
      citation.chapterId === hit.chapterId && citation.lessonId === hit.lessonId &&
      citation.materialId === hit.materialId && citation.versionKey === hit.versionKey &&
      !!citation.snippet.trim() && hit.text.includes(citation.snippet);
  });
}

export function evaluateDemoCase(testCase: DemoCase, result: CourseAnswer, hits: readonly RetrievedChunk[]): string[] {
  const failures: string[] = [];
  if (result.status !== testCase.expectedStatus) failures.push(`Expected status ${testCase.expectedStatus}; actual ${result.status}`);
  if (!result.answer.trim()) failures.push("Response text is empty");
  if (!verifyDemoCitations(result, hits)) failures.push("Citation count, source identity, version or supporting quote is invalid");
  if (testCase.expectedTopic) {
    const topic = testCase.expectedTopic;
    if (!hits.some(hit => hit.headingPath.includes(topic))) failures.push(`Expected retrieved topic: ${topic}`);
    if (!result.citations.some(citation => citation.headingPath.includes(topic))) failures.push(`Expected cited topic: ${topic}`);
  }
  return failures;
}
