import type { EmbeddingProvider, EmbeddingPurpose } from "../../services/ports/embeddingProvider.ts";
import { InvalidInput, InvalidOutput } from "../../domain/errors.ts";
import { embeddingConfig } from "../../config.ts";

type EmbeddingTransport = (url: string, init: RequestInit) => Promise<Response>;

export class GeminiEmbeddingAdapter implements EmbeddingProvider {
  constructor(
    private readonly apiKey: string,
    private readonly request: EmbeddingTransport = fetch,
  ) {
    if (!apiKey.trim()) throw new Error("GEMINI_API_KEY is required");
  }

  async embed(texts: readonly string[], purpose: EmbeddingPurpose = "document"): Promise<number[][]> {
    if (purpose !== "document" && purpose !== "query") {
      throw new InvalidInput("Embedding purpose must be document or query");
    }
    for (const text of texts) {
      if (typeof text !== "string" || !text.trim()) {
        throw new InvalidInput("Embedding input must contain non-empty text");
      }
    }

    const vectors: number[][] = [];
    // Một request cho mỗi text: Gemini 2 có thể aggregate nhiều parts thành một
    // vector. Gọi tuần tự giữ đúng thứ tự và tránh gửi burst khi học local.
    for (const text of texts) {
      vectors.push(await this.embedOne(text, purpose));
    }
    validateVectors(vectors, texts.length, embeddingConfig.dimension);
    return vectors;
  }

  private async embedOne(text: string, purpose: EmbeddingPurpose): Promise<number[]> {
    const content = purpose === "query"
      ? `task: search result | query: ${text}`
      : `title: none | text: ${text}`;
    const signal = AbortSignal.timeout(embeddingConfig.timeoutMs);
    let response: Response;
    try {
      response = await this.request(
        `https://generativelanguage.googleapis.com/v1beta/models/${embeddingConfig.model}:embedContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
          redirect: "error",
          signal,
          body: JSON.stringify({
            content: { parts: [{ text: content }] },
            embedContentConfig: {
              outputDimensionality: embeddingConfig.dimension,
              autoTruncate: false,
            },
          }),
        },
      );
    } catch {
      throw new Error(signal.aborted ? "Gemini embedding request timed out" : "Gemini embedding request failed");
    }

    if (!response.ok) {
      // Không đưa response body vào lỗi: có thể chứa input hoặc thông tin nhạy cảm.
      throw new Error(`Gemini embedding request failed (HTTP ${response.status})`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (signal.aborted) throw new Error("Gemini embedding request timed out");
      throw new InvalidOutput("Gemini embedding response must be valid JSON");
    }

    if (!payload || typeof payload !== "object" || !("embedding" in payload)) {
      throw new InvalidOutput("Gemini response is missing embedding");
    }
    const embedding = payload.embedding;
    if (!embedding || typeof embedding !== "object" || !("values" in embedding) || !Array.isArray(embedding.values)) {
      throw new InvalidOutput("Gemini response is missing embedding values");
    }

    validateVectors([embedding.values], 1, embeddingConfig.dimension);
    return embedding.values;
  }
}

export function createEmbeddingAdapter(apiKey = process.env.GEMINI_API_KEY): GeminiEmbeddingAdapter {
  if (!apiKey?.trim()) throw new Error("GEMINI_API_KEY is required");
  return new GeminiEmbeddingAdapter(apiKey);
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
