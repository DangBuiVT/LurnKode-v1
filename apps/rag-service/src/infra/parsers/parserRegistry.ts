import type { ParserRegistry } from "../../services/ports/documentParser.ts";
import { NotImplemented } from "../../domain/errors.ts";

export function createParserRegistry(): ParserRegistry {
  // TODO: Import adapters và nối txt/md -> textParser, pdf -> pdfParser,
  // pptx -> pptxParser, video -> videoParser. PDF slides dùng pdfParser.
  // TODO: Truyền registry cho parseMaterial từ composition root, không import infra vào services.
  throw new NotImplemented("createParserRegistry");
}
