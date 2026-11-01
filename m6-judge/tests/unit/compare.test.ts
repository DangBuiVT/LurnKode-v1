import { describe, it, expect } from "bun:test";
import { outputsMatch } from "../../src/domain/compare";

describe("outputsMatch", () => {
  it("should match identical output in exact mode", () => {
    expect(outputsMatch("5", "5", "exact")).toBe(true);
  });

  it("should reject trailing newline difference in exact mode", () => {
    expect(outputsMatch("5\n", "5", "exact")).toBe(false);
  });

  it("should treat CRLF and LF as equal in normalize_line_endings mode", () => {
    expect(outputsMatch("a\r\nb\r\n", "a\nb\n", "normalize_line_endings")).toBe(true);
  });

  it("should still reject trailing whitespace in normalize_line_endings mode", () => {
    expect(outputsMatch("a \n", "a\n", "normalize_line_endings")).toBe(false);
  });

  it("should ignore trailing whitespace per line and trailing blank lines in trim_trailing_whitespace mode", () => {
    expect(outputsMatch("a  \nb\t\n\n\n", "a\nb", "trim_trailing_whitespace")).toBe(true);
  });

  it("should still detect real differences in trim_trailing_whitespace mode", () => {
    expect(outputsMatch("a\nc", "a\nb", "trim_trailing_whitespace")).toBe(false);
  });

  it("should not ignore leading whitespace in trim_trailing_whitespace mode", () => {
    expect(outputsMatch(" a", "a", "trim_trailing_whitespace")).toBe(false);
  });
});
