import type { SourceLocation } from "./document.ts";

export interface TextChunk { location?: SourceLocation; text: string; ordinal: number; headingPath: string }
export interface IndexedChunk extends TextChunk {
  id: string;
  materialId: string;
  courseId: string;
  chapterId: string;
  lessonId: string;
  fileName: string | null;
  materialTitle: string;
  versionKey: string;
  embedding: number[];
}
