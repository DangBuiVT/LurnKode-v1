import type { RagConfig } from "../config.ts";
import type { RetrievalInput, RetrievalResult } from "../domain/retrieval.ts";
import type { RetrievalDependencies, RetrievalService } from "./ports/serviceContracts.ts";
import { AccessDenied, InvalidInput, InvalidOutput } from "../domain/errors.ts";
import { validateAndNormalizeVector, validateExternalId, validateRetrievalOptions, validateText } from "./validation.ts";

export const MAX_QUESTION_CHARACTERS = 4000;

export function createRetrievalService(ports: RetrievalDependencies, config: RagConfig): RetrievalService {
  const snapshot = { ...config };
  return { retrieve: input => retrieveChunks(input, ports, snapshot) };
}

export async function retrieveChunks(input: RetrievalInput, ports: RetrievalDependencies, config: RagConfig): Promise<RetrievalResult> {
  const learnerId = validateExternalId(input.learnerId);
  const courseId = validateExternalId(input.courseId);
  const question = validateText(input.question, "question").trim();
  if (question.length > MAX_QUESTION_CHARACTERS) {
    throw new InvalidInput(`Question must not exceed ${MAX_QUESTION_CHARACTERS} characters`);
  }
  const { topK, minScore, embeddingDim } = config;
  validateRetrievalOptions({ topK, minScore });
  if (!Number.isSafeInteger(embeddingDim) || embeddingDim < 1) {
    throw new InvalidInput("Embedding dimension must be a positive integer");
  }

  if (!await ports.access.canAskCourse(learnerId, courseId)) throw new AccessDenied();

  const embeddings = await ports.embeddings.embed([question], "query");
  if (!Array.isArray(embeddings) || embeddings.length !== 1) {
    throw new InvalidOutput("Query embedding must contain exactly one vector");
  }
  let vector: number[];
  try {
    vector = validateAndNormalizeVector(embeddings[0], embeddingDim);
  } catch (error) {
    if (error instanceof InvalidInput) throw new InvalidOutput("Invalid query embedding vector");
    throw error;
  }

  const hits = await ports.vectors.search({ courseId, vector, topK, minScore });
  if (!Array.isArray(hits)) throw new InvalidOutput("Search result must be an array");
  for (const hit of hits) {
    if (!hit || hit.courseId !== courseId || !Number.isFinite(hit.score) || hit.score < -1 || hit.score > 1) {
      throw new InvalidOutput("Search result violates course scope or score range");
    }
  }
  const seen = new Set<string>();
  const selected = hits
    .filter(hit => hit.score >= minScore)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .filter(hit => {
      if (seen.has(hit.id)) return false;
      seen.add(hit.id);
      return true;
    })
    .slice(0, topK)
    .map(({ embedding: _, ...hit }) => hit);
  return { courseId, question, hits: selected };
}
