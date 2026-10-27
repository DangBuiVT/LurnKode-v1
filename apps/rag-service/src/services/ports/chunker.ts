import type { DocumentFormat, ParsedDocument } from "../../domain/document.ts";
import type { TextChunk } from "../../domain/chunk.ts";
import type { ProcessingConfig } from "../../config.ts";

export type ChunkOptions = Readonly<ProcessingConfig["chunk"]>;
/** Nhận text đã parse từ mọi định dạng; giữ vị trí nguồn trên các chunk. */
export interface DocumentChunker {
  chunk(document: ParsedDocument): Promise<TextChunk[]>;
}

export type SectionChunker = (text: string, options: ChunkOptions) => TextChunk[];
export type ChunkerRegistry = Record<DocumentFormat, SectionChunker>;
