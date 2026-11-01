import { expect, test } from "bun:test";
import { DEMO_CASES, evaluateDemoCase, verifyDemoCitations } from "../scripts/demoCases.ts";
import { pythonFundamentals } from "../scripts/fixtures/pythonFundamentals.ts";
import { chunkMarkdown } from "../src/infra/chunkers/documentChunker.ts";
import type { CourseAnswer } from "../src/services/answerService.ts";
import type { RetrievedChunk } from "../src/domain/retrieval.ts";

const hit: RetrievedChunk = {
  id: "chunk-1", materialId: "material", courseId: "course", chapterId: "chapter", lessonId: "lesson",
  versionKey: "version-1", text: "A name can be bound to a different object by assignment.", ordinal: 0,
  headingPath: "Python Fundamentals > Variables and assignment", startOffset: 0, endOffset: 56,
  materialTitle: "Python Fundamentals", fileName: null, score: 0.8,
};
function answered(): CourseAnswer {
  return {
    courseId: hit.courseId, question: DEMO_CASES[0].question, status: "answered", answer: "Assignment binds a name to an object.",
    citations: [{ chunkId: hit.id, courseId: hit.courseId, chapterId: hit.chapterId, lessonId: hit.lessonId,
      materialId: hit.materialId, versionKey: hit.versionKey, fileName: null, headingPath: hit.headingPath,
      materialTitle: hit.materialTitle, snippet: hit.text }],
  };
}

test("unexpected answered result for an unsupported question fails the expected-vs-actual check", () => {
  expect(evaluateDemoCase(DEMO_CASES[3], answered(), [hit])).toContain("Expected status out_of_scope; actual answered");
});
test("a valid refused result needs zero citations", () => {
  const result: CourseAnswer = { ...answered(), status: "out_of_scope", answer: "Insufficient evidence.", citations: [] };
  expect(evaluateDemoCase(DEMO_CASES[2], result, [hit])).toEqual([]);
  expect(evaluateDemoCase(DEMO_CASES[2], { ...result, citations: answered().citations }, [hit])).not.toEqual([]);
});
test("matching status alone is insufficient for a grounded-answer pass", () => {
  expect(evaluateDemoCase(DEMO_CASES[0], { ...answered(), citations: [] }, [hit])).not.toEqual([]);
  expect(evaluateDemoCase(DEMO_CASES[0], answered(), [hit])).toEqual([]);
});
test("unknown citation IDs, wrong versions and invented quotes fail verification", () => {
  for (const update of [{ chunkId: "unknown" }, { versionKey: "wrong" }, { snippet: "Invented quote" }, { courseId: "other" }]) {
    const result = answered();
    result.citations[0] = { ...result.citations[0], ...update };
    expect(verifyDemoCitations(result, [hit])).toBe(false);
  }
});
test("expected source topic is checked independently of citation identity", () => {
  const other = { ...hit, headingPath: "Python Fundamentals > Loops" };
  const result = answered();
  result.citations[0].headingPath = other.headingPath;
  expect(evaluateDemoCase(DEMO_CASES[0], result, [other])).toContain("Expected retrieved topic: Variables and assignment");
});
test("the four requested questions are present as expectations, separate from runtime answers", () => {
  expect(DEMO_CASES.map(item => item.expectedStatus)).toEqual(["answered", "answered", "out_of_scope", "out_of_scope"]);
  expect(DEMO_CASES[1].question).toBe("Tại sao giá trị của một biến Python có thể thay đổi trong quá trình chương trình chạy?");
  expect(DEMO_CASES[3].question).toBe("Theo tài liệu này, Python 4.0 sẽ được phát hành vào ngày nào?");
});
test("teaching material contains all six topics and preserves complete code fences in chunks", () => {
  const chunks = chunkMarkdown(pythonFundamentals.textContent);
  for (const heading of ["Variables and assignment", "Data types", "Conditional statements", "Loops", "Functions", "Common programming mistakes"]) {
    expect(chunks.some(chunk => chunk.headingPath.endsWith(heading))).toBe(true);
  }
  const examples = pythonFundamentals.textContent.match(/```python\n[\s\S]*?\n```/g) ?? [];
  expect(examples).toHaveLength(6);
  for (const example of examples) expect(chunks.some(chunk => chunk.text === example)).toBe(true);
  expect(chunks.length).toBeGreaterThan(12);
  for (const chunk of chunks) {
    expect(chunk.text.trim()).not.toMatch(/^#{1,6}(?:\s|$)/);
    expect(pythonFundamentals.textContent.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
    if (!chunk.text.startsWith("```")) expect((chunk.text.match(/\S+/g) ?? []).length).toBeLessThanOrEqual(300);
  }
});
