import type { SourceLocation } from "./document.ts";

export interface TextChunk {
  text: string;
  ordinal: number; 
  headingPath: string;
  startOffset: number;
  endOffset: number;
  location?: SourceLocation; 
}
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
