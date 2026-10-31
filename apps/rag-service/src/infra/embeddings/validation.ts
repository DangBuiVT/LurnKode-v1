import type { EmbeddingPurpose } from "../../services/ports/embeddingProvider.ts";
import { InvalidInput, InvalidOutput } from "../../domain/errors.ts";

export function validateEmbeddingInput(texts: readonly string[], purpose: EmbeddingPurpose): void {
  if (purpose !== "document" && purpose !== "query") {
    throw new InvalidInput("Embedding purpose must be document or query");
  }
  for (const text of texts) {
    if (typeof text !== "string" || !text.trim()) {
      throw new InvalidInput("Embedding input must contain non-empty text");
    }
  }
}

export function parseEmbeddingResponse(payload: unknown, dimension: number): number[] {
  if (!payload || typeof payload !== "object" || !("embedding" in payload)) {
    throw new InvalidOutput("Gemini response is missing embedding");
  }
  const embedding = payload.embedding;
  if (!embedding || typeof embedding !== "object" || !("values" in embedding) || !Array.isArray(embedding.values)) {
    throw new InvalidOutput("Gemini response is missing embedding values");
  }
  validateVectors([embedding.values], 1, dimension);
  return embedding.values;
}

export function validateVectors(vectors: readonly (readonly number[])[], expectedCount: number, dimension: number): void {
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 0)
    throw new InvalidInput("expectedCount must be a non-negative integer");

  if (!Number.isSafeInteger(dimension) || dimension <= 0)
    throw new InvalidInput("dimension must be a positive integer");

  if (!Array.isArray(vectors))
    throw new InvalidOutput("Embedding result must be an array");

  if (vectors.length !== expectedCount) {
    throw new InvalidOutput(
      `Expected ${expectedCount} vectors, received ${vectors.length}`,
    );
  }

  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];

    if (!Array.isArray(vector)) {
      throw new InvalidOutput(`Vector ${i} must be an array`);
    }

    if (vector.length !== dimension) {
      throw new InvalidOutput(
        `Vector ${i}: expected ${dimension} dimensions, received ${vector.length}`,
      );
    }

    for (let j = 0; j < vector.length; j++) {
      if (!Number.isFinite(vector[j])) {
        throw new InvalidOutput(
          `Vector ${i}, component ${j} must be a finite number`
        );
      }
    }
  }
}
