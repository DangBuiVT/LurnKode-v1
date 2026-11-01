import type { CourseAccessClient } from "../../services/ports/lmsClient.ts";
import { AccessDenied, InvalidInput, InvalidOutput, Unauthenticated } from "../../domain/errors.ts";
import { validateExternalId } from "../../services/validation.ts";

type AccessTransport = (url: string, init: RequestInit) => Promise<Response>;
export interface CourseAccessOptions {
  baseUrl: string;
  bearerToken: string;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function responseId(value: unknown): string {
  try {
    return validateExternalId(value as string);
  } catch {
    throw new InvalidOutput("Invalid M1/M2 response ID");
  }
}

export class LmsCourseAccessClient implements CourseAccessClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(options: CourseAccessOptions, private readonly request: AccessTransport = fetch) {
    const url = new URL(options.baseUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new InvalidInput("M1/M2 base URL must be HTTP(S) without credentials, query or fragment");
    }
    if (!options.bearerToken || !/^\S+$/.test(options.bearerToken)) {
      throw new InvalidInput("A Bearer token without whitespace is required");
    }
    this.baseUrl = url.href.replace(/\/$/, "");
    this.token = options.bearerToken;
    this.timeoutMs = options.timeoutMs ?? 10000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 2147483647) {
      throw new InvalidInput("Invalid M1/M2 access timeout");
    }
  }

  async getLearnerId(): Promise<string> {
    const data = await this.get("/api/v1/auth/me");
    if (!isRecord(data) || !["Learner", "Instructor", "Admin"].includes(data.role as string)) {
      throw new InvalidOutput("Invalid M1 identity response");
    }
    const id = responseId(data.userId);
    if (data.role !== "Learner") throw new AccessDenied();
    return id;
  }

  async canAskCourse(learnerId: string, courseId: string): Promise<boolean> {
    const learner = validateExternalId(learnerId);
    const course = validateExternalId(courseId);
    if (await this.getLearnerId() !== learner) return false;
    const data = await this.get("/api/v1/my/enrollments");
    if (!Array.isArray(data)) throw new InvalidOutput("Invalid M2 enrollment response");
    let allowed = false;
    for (const row of data) {
      if (!isRecord(row) || !isRecord(row.course) ||
          !["draft", "published"].includes(row.course.status as string)) {
        throw new InvalidOutput("Invalid M2 enrollment fields");
      }
      const enrollmentCourse = responseId(row.courseId);
      if (responseId(row.learnerId) !== learner || responseId(row.course.id) !== enrollmentCourse) {
        throw new InvalidOutput("M2 enrollment identity/course mismatch");
      }
      if (enrollmentCourse === course && row.course.status === "published") allowed = true;
    }
    return allowed;
  }

  private async get(path: string): Promise<unknown> {
    const signal = AbortSignal.timeout(this.timeoutMs);
    let response: Response;
    try {
      response = await this.request(`${this.baseUrl}${path}`, {
        method: "GET", headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
        redirect: "error", signal,
      });
    } catch {
      throw new Error(signal.aborted ? "M1/M2 access request timed out" : "M1/M2 access request failed");
    }
    if (response.status === 401) throw new Unauthenticated();
    if (response.status === 403) throw new AccessDenied();
    if (!response.ok) throw new Error(`M1/M2 access request failed (HTTP ${response.status})`);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (signal.aborted) throw new Error("M1/M2 access request timed out");
      throw new InvalidOutput("M1/M2 access response must be valid JSON");
    }
    if (!isRecord(payload) || payload.success !== true || !("data" in payload)) {
      throw new InvalidOutput("Invalid M1/M2 access response envelope");
    }
    return payload.data;
  }
}
