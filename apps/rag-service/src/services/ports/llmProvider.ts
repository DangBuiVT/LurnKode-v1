import type { SearchHit } from "../../domain/retrieval.ts";

export interface LLMProvider {
  generate(input: { question: string; contexts: readonly SearchHit[] }): Promise<{ answer: string; citedChunkIds: string[] }>;
}
