import type { RetrievedChunk } from "../../domain/retrieval.ts";

export interface GeneratedAnswer {
  status: "answered" | "out_of_scope";
  answer: string;
  citedChunkIds: string[];
  evidence: { chunkId: string; quote: string }[];
}

export interface LLMProvider {
  generate(input: { question: string; contexts: readonly RetrievedChunk[] }): Promise<GeneratedAnswer>;
}
