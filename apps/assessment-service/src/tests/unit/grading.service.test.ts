import { describe, it, expect } from "vitest";
import {
  gradeMcq,
  computeProgrammingScore,
  type TestCaseSpec,
  type TestResultReport,
} from "../../services/grading.service";

describe("gradeMcq", () => {
  it("correct single answer gets full points", () => {
    expect(gradeMcq(["a"], ["a"], 10)).toEqual({ score: 10, status: "correct" });
  });

  it("wrong single answer gets 0", () => {
    expect(gradeMcq(["b"], ["a"], 10)).toEqual({ score: 0, status: "incorrect" });
  });

  it("empty selection gets 0", () => {
    expect(gradeMcq([], ["a"], 10)).toEqual({ score: 0, status: "incorrect" });
  });

  it("multiple: exact match in any order is correct", () => {
    expect(gradeMcq(["b", "a"], ["a", "b"], 10)).toEqual({ score: 10, status: "correct" });
  });

  it("multiple: missing one is incorrect", () => {
    expect(gradeMcq(["a"], ["a", "b"], 10)).toEqual({ score: 0, status: "incorrect" });
  });

  it("multiple: extra wrong option is incorrect", () => {
    expect(gradeMcq(["a", "b", "c"], ["a", "b"], 10)).toEqual({ score: 0, status: "incorrect" });
  });

  it("duplicate selections are ignored", () => {
    expect(gradeMcq(["a", "a"], ["a"], 10)).toEqual({ score: 10, status: "correct" });
  });
});

describe("computeProgrammingScore", () => {
  const specs: TestCaseSpec[] = [
    { id: "tc_1", weight: 1, hidden: false },
    { id: "tc_2", weight: 2, hidden: true },
    { id: "tc_3", weight: 1, hidden: true },
  ];

  it("all test cases passed (AC) gives full score and AC status", () => {
    const results: TestResultReport[] = [
      { testCaseId: "tc_1", status: "AC" },
      { testCaseId: "tc_2", status: "AC" },
      { testCaseId: "tc_3", status: "AC" },
    ];

    const res = computeProgrammingScore(specs, results, 100);
    expect(res).toEqual({
      score: 100,
      maxScore: 100,
      finalStatus: "AC",
      passedTests: 3,
      totalTests: 3,
    });
  });

  it("partial score based on test case weights", () => {
    // Total weight = 1 + 2 + 1 = 4. Passing tc_1 (1) + tc_2 (2) = 3/4 * 100 = 75
    const results: TestResultReport[] = [
      { testCaseId: "tc_1", status: "AC" },
      { testCaseId: "tc_2", status: "AC" },
      { testCaseId: "tc_3", status: "WA" },
    ];

    const res = computeProgrammingScore(specs, results, 100);
    expect(res).toEqual({
      score: 75,
      maxScore: 100,
      finalStatus: "WA",
      passedTests: 2,
      totalTests: 3,
    });
  });

  it("reflects runtime error or TLE as final status when failed", () => {
    const results: TestResultReport[] = [
      { testCaseId: "tc_1", status: "TLE" },
      { testCaseId: "tc_2", status: "AC" },
      { testCaseId: "tc_3", status: "AC" },
    ];

    const res = computeProgrammingScore(specs, results, 100);
    expect(res.finalStatus).toBe("TLE");
    expect(res.score).toBe(75);
    expect(res.passedTests).toBe(2);
  });

  it("zero score when all tests fail", () => {
    const results: TestResultReport[] = [
      { testCaseId: "tc_1", status: "WA" },
      { testCaseId: "tc_2", status: "RE" },
      { testCaseId: "tc_3", status: "TLE" },
    ];

    const res = computeProgrammingScore(specs, results, 100);
    expect(res.score).toBe(0);
    expect(res.finalStatus).toBe("WA");
    expect(res.passedTests).toBe(0);
  });

  it("handles missing test case reports gracefully", () => {
    const results: TestResultReport[] = [
      { testCaseId: "tc_1", status: "AC" },
      // tc_2 and tc_3 missing
    ];

    const res = computeProgrammingScore(specs, results, 100);
    expect(res.score).toBe(25);
    expect(res.finalStatus).toBe("WA");
    expect(res.passedTests).toBe(1);
  });
});

