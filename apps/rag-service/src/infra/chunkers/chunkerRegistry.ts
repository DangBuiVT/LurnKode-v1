import type { ChunkerRegistry } from "../../services/ports/chunker.ts";
import { chunkMarkdown, chunkText } from "./documentChunker.ts";

export function createChunkerRegistry(): ChunkerRegistry {
  return {
    md: chunkMarkdown,
    txt: chunkText,
    pdf: chunkText,
    pptx: chunkText,
    video: chunkText,
  };
}
