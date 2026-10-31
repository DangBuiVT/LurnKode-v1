import { describe, it, expect } from "vitest";
import { computeProgrammingScore, type TestCaseSpec, type TestResultReport } from "../../services/programming-grading.service";

describe("Programming Grading Engine", () => {
  const specs: TestCaseSpec[] = [
    { id: "test_1", weight: 2, hidden: false },
    { id: "test_2", weight: 3, hidden: true },
  ];

  it("awards full points when all test cases pass with AC", () => {
    const reports: TestResultReport[] = [
      { testCaseId: "test_1", status: "AC" },
      { testCaseId: "test_2", status: "AC" },
    ];
    const result = computeProgrammingScore(specs, reports, 50);
    expect(result.score).toBe(50);
    expect(result.finalStatus).toBe("AC");
    expect(result.passedTests).toBe(2);
  });

  it("calculates partial credit proportionally according to weights", () => {
    // Only test_1 passes (2 / 5 * 50 = 20 points)
    const reports: TestResultReport[] = [
      { testCaseId: "test_1", status: "AC" },
      { testCaseId: "test_2", status: "WA" },
    ];
    const result = computeProgrammingScore(specs, reports, 50);
    expect(result.score).toBe(20);
    expect(result.finalStatus).toBe("WA");
  });

  it("handles runtime error and timeout status codes", () => {
    const reports: TestResultReport[] = [
      { testCaseId: "test_1", status: "RE" },
      { testCaseId: "test_2", status: "TLE" },
    ];
    const result = computeProgrammingScore(specs, reports, 50);
    expect(result.score).toBe(0);
    expect(result.finalStatus).toBe("RE");
  });

  it("accepts proposal RTE verdict alias", () => {
    const reports: TestResultReport[] = [
      { testCaseId: "test_1", status: "RTE" },
      { testCaseId: "test_2", status: "AC" },
    ];
    const result = computeProgrammingScore(specs, reports, 50);
    // test_2 passes (3 / 5 * 50 = 30 points), first failure is RTE
    expect(result.score).toBe(30);
    expect(result.finalStatus).toBe("RTE");
  });

  it("enforces score bounds between 0 and maxPoints", () => {
    const emptySpecs: TestCaseSpec[] = [];
    const emptyResult = computeProgrammingScore(emptySpecs, [], 100);
    expect(emptyResult.score).toBe(0);
  });
});

