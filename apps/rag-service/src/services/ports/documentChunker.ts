import type { ParsedDocument } from "../../domain/document.ts";
import type { TextChunk } from "../../domain/chunk.ts";

export interface ChunkOptions { words: number; overlap: number }
/** Nhận text đã parse từ mọi định dạng; giữ vị trí nguồn trên các chunk. */
export interface DocumentChunker {
  chunk(document: ParsedDocument, options: ChunkOptions): Promise<TextChunk[]>;
}
