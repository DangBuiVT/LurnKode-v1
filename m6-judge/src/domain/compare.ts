export type ComparisonMode = "exact" | "normalize_line_endings" | "trim_trailing_whitespace";

export const COMPARISON_MODES: readonly ComparisonMode[] = [
  "exact",
  "normalize_line_endings",
  "trim_trailing_whitespace",
];

const toLf = (s: string) => s.replace(/\r\n?/g, "\n");

/** Compare program output with expected output under the given policy. */
export function outputsMatch(actual: string, expected: string, mode: ComparisonMode): boolean {
  switch (mode) {
    case "exact":
      return actual === expected;
    case "normalize_line_endings":
      return toLf(actual) === toLf(expected);
    case "trim_trailing_whitespace": {
      const norm = (s: string) =>
        toLf(s)
          .split("\n")
          .map((l) => l.replace(/[ \t]+$/, ""))
          .join("\n")
          .replace(/\n+$/, "");
      return norm(actual) === norm(expected);
    }
  }
}
