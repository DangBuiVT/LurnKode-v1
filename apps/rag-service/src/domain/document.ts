export type DocumentFormat = "txt" | "md" | "pdf" | "pptx" | "video";
export type SourceLocation =
  | { page: number }
  | { slide: number }
  | { startSeconds: number; endSeconds: number };
export interface ParsedSection { text: string; location?: SourceLocation }
export interface ParsedDocument {
  format: DocumentFormat;
  sections: ParsedSection[];
}
