import type { SourceLocation } from "./document.ts";

export interface Citation {
  location?: SourceLocation;
  chunkId: string;
  materialId: string;
  courseId: string;
  chapterId: string;
  lessonId: string;
  versionKey: string;
  fileName: string | null;
  headingPath: string;
  snippet: string;
  materialTitle: string;
}

export interface CitationSource {
  fileName: string | null;
  materialTitle: string;
  text: string;
  location?: SourceLocation;
}
