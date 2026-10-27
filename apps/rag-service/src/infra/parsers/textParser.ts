import type { DocumentParser, ParserInput } from "../../services/ports/documentParser.ts";
import type { ParsedDocument } from "../../domain/document.ts";

export class TextParser implements DocumentParser {
  async parse(input: ParserInput): Promise<ParsedDocument> {
    const format = input.format;
    const bytes = input.bytes;

    const decoder = new TextDecoder("utf-8", { fatal: true});
    const decoded = decoder.decode(bytes);
    const normalized = decoded.replace(/\r\n?/g, "\n");

    return {
      format,
      sections: [{ text: normalized }],
    };
  }
}
