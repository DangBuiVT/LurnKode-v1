import { describe, expect, test } from "bun:test";
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
  test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "từ chối maxBytes không hợp lệ: %s",
    async maxBytes => {
      await expect(parseMaterial(textInput(), createParserRegistry(), maxBytes))
        .rejects.toBeInstanceOf(InvalidInput);
    },
  );

  test("từ chối định dạng ngoài registry", async () => {
    const input = { ...textInput(), format: "docx" } as unknown as ParserInput;
    await expect(parseMaterial(input, createParserRegistry())).rejects.toBeInstanceOf(InvalidInput);
  });

  test("từ chối bytes rỗng", async () => {
    await expect(parseMaterial(textInput(""), createParserRegistry())).rejects.toBeInstanceOf(InvalidInput);
  });

  test("giới hạn theo bytes UTF-8 thay vì số ký tự", async () => {
    // "ế" có một ký tự nhưng chiếm ba bytes UTF-8.
    await expect(parseMaterial(textInput("ế"), createParserRegistry(), 2))
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
