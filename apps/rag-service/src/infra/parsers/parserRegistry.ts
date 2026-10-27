import type { ParserRegistry } from "../../services/ports/documentParser.ts";
import { TextParser } from "./textParser.ts";
import { PdfParser } from "./pdfParser.ts";
import { PptxParser } from "./pptxParser.ts";
import { VideoParser } from "./videoParser.ts";

export function createParserRegistry(): ParserRegistry {
  const textParser = new TextParser();
  return {
    txt: textParser,
    md: textParser,
    pdf: new PdfParser(),
    pptx: new PptxParser(),
    video: new VideoParser(),
  };
}
