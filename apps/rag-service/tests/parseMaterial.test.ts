import { describe, expect, test } from "bun:test";
import { processingConfig } from "../src/config.ts";
import type { ParsedDocument } from "../src/domain/document.ts";
import { InvalidInput, InvalidOutput } from "../src/domain/errors.ts";
import { createParserRegistry } from "../src/infra/parsers/parserRegistry.ts";
import { parseMaterial } from "../src/services/ingestionService.ts";
import type { ParserInput, ParserRegistry } from "../src/services/ports/documentParser.ts";

const encoder = new TextEncoder();

function textInput(text = "Xin chào"): ParserInput {
  return { format: "txt", bytes: encoder.encode(text) };
}

// Cố ý mô phỏng adapter vi phạm hợp đồng để kiểm tra validation ở service.
function registryReturning(output: unknown): ParserRegistry {
  return {
    ...createParserRegistry(),
    txt: { async parse() { return output as ParsedDocument; } },
  };
}

describe("parseMaterial — đầu vào không hợp lệ", () => {
  test("từ chối định dạng ngoài registry", async () => {
    const input = { ...textInput(), format: "docx" } as unknown as ParserInput;
    await expect(parseMaterial(input, createParserRegistry())).rejects.toBeInstanceOf(InvalidInput);
  });

  test("từ chối bytes rỗng", async () => {
    await expect(parseMaterial(textInput(""), createParserRegistry())).rejects.toBeInstanceOf(InvalidInput);
  });

  test("từ chối file vượt processingConfig.maxBytes", async () => {
    const input: ParserInput = {
      format: "txt",
      bytes: new Uint8Array(processingConfig.maxBytes + 1),
    };
    await expect(parseMaterial(input, createParserRegistry()))
      .rejects.toBeInstanceOf(InvalidInput);
  });
  test("từ chối tài liệu toàn khoảng trắng", async () => {
    await expect(parseMaterial(textInput(" \t\r\n"), createParserRegistry()))
      .rejects.toBeInstanceOf(InvalidInput);
  });

});

describe("parseMaterial — đầu ra parser vi phạm hợp đồng", () => {
  test.each([
    ["không có document", null],
    ["sai format", { format: "md", sections: [{ text: "Nội dung" }] }],
    ["thiếu sections", { format: "txt" }],
    ["sections không phải array", { format: "txt", sections: {} }],
    ["sections rỗng", { format: "txt", sections: [] }],
  ])("báo InvalidOutput khi %s", async (_name, output) => {
    await expect(parseMaterial(textInput(), registryReturning(output)))
      .rejects.toBeInstanceOf(InvalidOutput);
  });
});
