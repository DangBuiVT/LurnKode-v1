import type { DocumentFormat, ParsedDocument } from "../../domain/document.ts";

export interface ParserInput { format: DocumentFormat; bytes: Uint8Array }
export interface DocumentParser { parse(input: ParserInput): Promise<ParsedDocument> }
export type ParserRegistry = Record<DocumentFormat, DocumentParser>;
