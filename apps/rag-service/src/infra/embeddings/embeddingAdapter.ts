import type { EmbeddingProvider, EmbeddingPurpose } from "../../services/ports/embeddingProvider.ts";
import { InvalidOutput } from "../../domain/errors.ts";
import { embeddingConfig } from "../../config.ts";
import { parseEmbeddingResponse, validateEmbeddingInput } from "./validation.ts";

export { validateVectors } from "./validation.ts";

type EmbeddingTransport = (url: string, init: RequestInit) => Promise<Response>;

export class GeminiEmbeddingAdapter implements EmbeddingProvider {
  constructor(
    private readonly apiKey: string,
    private readonly request: EmbeddingTransport = fetch,
  ) {
    if (!apiKey.trim()) throw new Error("GEMINI_API_KEY is required");
  }

  async embed(texts: readonly string[], purpose: EmbeddingPurpose = "document"): Promise<number[][]> {
    validateEmbeddingInput(texts, purpose);

    const vectors: number[][] = [];
    for (const text of texts) {
      const payload = await this.requestEmbedding(text, purpose);
      vectors.push(parseEmbeddingResponse(payload, embeddingConfig.dimension));
    }
    return vectors;
  }

  private async requestEmbedding(text: string, purpose: EmbeddingPurpose): Promise<unknown> {
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
      throw new Error(`Gemini embedding request failed (HTTP ${response.status})`);
    }

    try {
      return await response.json();
    } catch {
      if (signal.aborted) throw new Error("Gemini embedding request timed out");
      throw new InvalidOutput("Gemini embedding response must be valid JSON");
    }
  }
}

export function createEmbeddingAdapter(apiKey = process.env.GEMINI_API_KEY): GeminiEmbeddingAdapter {
  if (!apiKey?.trim()) throw new Error("GEMINI_API_KEY is required");
  return new GeminiEmbeddingAdapter(apiKey);
}
