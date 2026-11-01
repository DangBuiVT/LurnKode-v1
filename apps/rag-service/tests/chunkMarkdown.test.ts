import { describe, expect, test } from "bun:test";
import { chunkMarkdown, chunkText, chunkDocument } from "../src/infra/chunkers/documentChunker.ts";
import { createChunkerRegistry } from "../src/infra/chunkers/chunkerRegistry.ts";
import { defaultRagConfig } from "../src/config.ts";

const words = (text: string) => text.match(/\S+/g) ?? [];

describe("Markdown heading and fence boundaries", () => {
  test("heading before a fenced example does not become an isolated chunk", () => {
    const markdown = "# Python\n\n## Ví dụ\n\n```python\nx = 10\nprint(x)\n```";
    const chunks = chunkMarkdown(markdown);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ text: "```python\nx = 10\nprint(x)\n```", headingPath: "Python > Ví dụ", ordinal: 0 });
    expect(markdown.slice(chunks[0].startOffset, chunks[0].endOffset)).toBe(chunks[0].text);
  });

  test("headings without body text produce no chunks", () => {
    expect(chunkMarkdown("# Course\n\n## Topic\n\n### Details\n")).toEqual([]);
  });

  test("prose has heading metadata without duplicating heading text", () => {
    const markdown = "# Course\n\n## Variables\n\nA name refers to an object.\n\nAssignment binds the name.";
    const chunks = chunkMarkdown(markdown);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].headingPath).toBe("Course > Variables");
    expect(chunks[0].text).toBe("A name refers to an object.\n\nAssignment binds the name.");
    expect(markdown.slice(chunks[0].startOffset, chunks[0].endOffset)).toBe(chunks[0].text);
  });

  test("heading characters inside code are preserved as code", () => {
    const code = "```python\n# This is a Python comment\nvalue = '# not a heading'\n```";
    const chunks = chunkMarkdown(`# Code\n\n${code}\n\nExplanation after code.`);
    expect(chunks.map(chunk => chunk.text)).toEqual([code, "Explanation after code."]);
    expect(chunks.map(chunk => chunk.headingPath)).toEqual(["Code", "Code"]);
  });

  test("unclosed and tilde fences are retained without inventing a closing fence", () => {
    const unclosed = "```python\nvalue = 1";
    expect(chunkMarkdown(`# Example\n\n${unclosed}`)[0].text).toBe(unclosed);
    const tilde = "~~~python\nprint(1)\n~~~";
    expect(chunkMarkdown(`# Example\n\n${tilde}`)[0].text).toBe(tilde);
  });

  test("long code stays intact, including both fences", () => {
    const code = `\x60\x60\x60python\n${"print('one two three')\n".repeat(150)}\x60\x60\x60`;
    const chunks = chunkMarkdown(`# Long example\n\n${code}`);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe(code);
    expect(words(chunks[0].text).length).toBeGreaterThan(300);
  });

  test("300-word windows keep 50-word overlap within a section", () => {
    const body = Array.from({ length: 800 }, (_, index) => `word${index}`).join(" ");
    const markdown = `# Topic\n\n${body}`;
    const chunks = chunkMarkdown(markdown);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].text).toBe(words(body).slice(0, 300).join(" "));
    expect(chunks[1].text).toBe(words(body).slice(250, 550).join(" "));
    for (const chunk of chunks) expect(markdown.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
  });

  test("repeated headings are distinct sections without overlap", () => {
    const markdown = "# Topic\n\nFirst body.\n\n# Topic\n\nSecond body.";
    const chunks = chunkMarkdown(markdown);
    expect(chunks.map(chunk => chunk.text)).toEqual(["First body.", "Second body."]);
    expect(chunks.map(chunk => chunk.ordinal)).toEqual([0, 1]);
  });

  test("CRLF normalization and Unicode offsets still refer to normalized source", () => {
    const markdown = "# Bài học\r\n\r\nBiến 🐍 tham chiếu đến đối tượng.\r\n\r\n## Code\r\n\r\n```python\r\nx = 10\r\n```";
    const normalized = markdown.replace(/\r\n?/g, "\n");
    for (const chunk of chunkMarkdown(markdown)) expect(normalized.slice(chunk.startOffset, chunk.endOffset)).toBe(chunk.text);
  });

  test("DocumentChunker retains source location and contiguous ordinals", () => {
    const chunks = chunkDocument({ format: "md", sections: [{ text: "# A\n\nBody.", location: { page: 1 } }, { text: "# B\n\nOther body.", location: { page: 2 } }] }, createChunkerRegistry());
    expect(chunks.map(chunk => chunk.ordinal)).toEqual([0, 1]);
    expect(chunks.map(chunk => chunk.location)).toEqual([{ page: 1 }, { page: 2 }]);
  });

  test("plain text behavior and chunk limits remain unchanged", () => {
    expect(defaultRagConfig().processing.chunk).toEqual({ limitWords: 300, overlapWords: 50 });
    expect(chunkText("  plain text  ")[0].text).toBe("plain text");
  });
});
