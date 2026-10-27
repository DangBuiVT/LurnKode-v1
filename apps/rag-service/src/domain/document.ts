/** Chỉ định nghĩa dữ liệu đầu ra của parser; kiểu chunk nằm trong chunk.ts, thuật toán nằm trong infra/chunkers/. */
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
