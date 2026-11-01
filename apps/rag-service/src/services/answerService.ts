import type { RetrievalInput, RetrievedChunk } from "../domain/retrieval.ts";
import type { Citation } from "../domain/citation.ts";
import type { AnswerStatus } from "../domain/conversation.ts";
import type { LLMProvider } from "./ports/llmProvider.ts";
import type { RetrievalService } from "./ports/serviceContracts.ts";
import { InvalidInput, InvalidOutput } from "../domain/errors.ts";
import { validateExternalId, validateText } from "./validation.ts";

export const OUT_OF_SCOPE_ANSWER = "Tôi chưa tìm thấy bằng chứng đủ trong học liệu của khóa học để trả lời câu hỏi này. Hãy hỏi về nội dung bài học trong khóa học.";

export interface CourseAnswer {
  courseId: string;
  question: string;
  status: AnswerStatus;
  answer: string;
  citations: Citation[];
}
export interface AnswerDependencies {
  retrieval: RetrievalService;
  generator: LLMProvider;
}
export function createAnswerService(ports: AnswerDependencies) {
  return { answer: (input: RetrievalInput) => answerCourseQuestion(input, ports) };
}
export async function answerCourseQuestion(input: RetrievalInput, ports: AnswerDependencies): Promise<CourseAnswer> {
  const courseId = validateExternalId(input.courseId);
  const result = await ports.retrieval.retrieve(input);
  if (result.courseId !== courseId || !Array.isArray(result.hits) || result.hits.some(hit => hit.courseId !== courseId)) {
    throw new InvalidOutput("Answer retrieval violates course scope");
  }
  const refusal: CourseAnswer = { courseId, question: result.question, status: "out_of_scope", answer: OUT_OF_SCOPE_ANSWER, citations: [] };
  if (result.hits.length === 0) return refusal;
  const generated = await ports.generator.generate({ question: result.question, contexts: result.hits });
  if (generated.status === "out_of_scope") return refusal;
  if (generated.status !== "answered" || typeof generated.answer !== "string" || !generated.answer.trim() ||
      generated.answer.includes("\0") || generated.answer.length > 12000) {
    throw new InvalidOutput("Invalid generated answer");
  }
  const citations = verifiedCitations(result.hits, generated.citedChunkIds);
  if (!citations || !Array.isArray(generated.evidence) || generated.evidence.length !== citations.length) return refusal;
  for (const citation of citations) {
    const evidence = generated.evidence.filter(item => item.chunkId === citation.chunkId);
    const source = result.hits.find(hit => hit.id === citation.chunkId)!;
    if (evidence.length !== 1 || typeof evidence[0].quote !== "string" || !evidence[0].quote.trim() ||
        evidence[0].quote.length > 1000 || !source.text.includes(evidence[0].quote)) return refusal;
    citation.snippet = evidence[0].quote;
  }
  return { courseId, question: result.question, status: "answered", answer: generated.answer.trim(), citations };
}
export function verifiedCitations(hits: readonly RetrievedChunk[], claimedIds: readonly string[]): Citation[] | null {
  if (!Array.isArray(claimedIds) || claimedIds.length === 0 || claimedIds.some(id => typeof id !== "string")) return null;
  const byId = new Map(hits.map(hit => [hit.id, hit]));
  const citations: Citation[] = [];
  for (const id of new Set(claimedIds)) {
    const hit = byId.get(id);
    if (!hit) return null;
    try {
      citations.push({
        chunkId: id,
        courseId: validateExternalId(hit.courseId),
        chapterId: validateExternalId(hit.chapterId),
        lessonId: validateExternalId(hit.lessonId),
        materialId: validateExternalId(hit.materialId),
        versionKey: validateText(hit.versionKey, "source version"),
        fileName: hit.fileName,
        headingPath: hit.headingPath,
        snippet: validateText(hit.text, "source text").slice(0, 500),
        materialTitle: validateText(hit.materialTitle, "material title"),
        ...(hit.location ? { location: { ...hit.location } } : {}),
      });
    } catch (error) {
      if (error instanceof InvalidInput) return null;
      throw error;
    }
  }
  return citations;
}
