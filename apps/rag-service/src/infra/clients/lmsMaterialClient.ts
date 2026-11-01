import type { MaterialClient } from "../../services/ports/lmsClient.ts";
import type { MaterialSource } from "../../domain/material.ts";
import { InvalidInput, InvalidOutput } from "../../domain/errors.ts";
import { validateExternalId, validateText } from "../../services/validation.ts";

type MaterialTransport = (url: string, init: RequestInit) => Promise<Response>;

export interface LmsMaterialClientOptions {
  baseUrl: string;
  internalKey: string;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseMaterialResponse(payload: unknown, requestedId: string): MaterialSource {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.data)) {
    throw new InvalidOutput("Invalid M2 material response envelope");
  }
  const data = payload.data;
  if ((data.type !== "markdown" && data.type !== "video" && data.type !== "slide") ||
      (data.courseStatus !== "draft" && data.courseStatus !== "published") ||
      typeof data.isRagSource !== "boolean" ||
      (data.textContent !== null && typeof data.textContent !== "string") ||
      (data.contentUrl !== null && typeof data.contentUrl !== "string")) {
    throw new InvalidOutput("Invalid M2 material response fields");
  }

  try {
    const id = validateExternalId(data.materialId as string);
    if (id !== requestedId) throw new InvalidOutput("M2 returned a different material");
    return {
      id,
      courseId: validateExternalId(data.courseId as string),
      chapterId: validateExternalId(data.chapterId as string),
      lessonId: validateExternalId(data.lessonId as string),
      title: validateText(data.title as string, "material title"),
      textContent: data.textContent === null ? null : validateText(data.textContent, "Markdown content", true),
      contentUrl: data.contentUrl === null ? null : validateText(data.contentUrl, "content URL", true),
      type: data.type,
      isRagSource: data.isRagSource,
      courseStatus: data.courseStatus,
    };
  } catch (error) {
    if (error instanceof InvalidInput) throw new InvalidOutput("Invalid M2 material metadata");
    throw error;
  }
}

export class LmsMaterialClient implements MaterialClient {
  private readonly baseUrl: string;
  private readonly internalKey: string;
  private readonly timeoutMs: number;

  constructor(options: LmsMaterialClientOptions, private readonly request: MaterialTransport = fetch) {
    const url = new URL(options.baseUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new InvalidInput("M2 base URL must be an HTTP(S) URL without credentials, query or fragment");
    }
    this.baseUrl = url.href.replace(/\/$/, "");
    this.internalKey = validateText(options.internalKey, "M2 internal service key");
    this.timeoutMs = options.timeoutMs ?? 10000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 2147483647) {
      throw new InvalidInput("Invalid M2 request timeout");
    }
  }

  async getMaterial(materialId: string): Promise<MaterialSource | null> {
    const id = validateExternalId(materialId);
    const signal = AbortSignal.timeout(this.timeoutMs);
    let response: Response;
    try {
      response = await this.request(`${this.baseUrl}/internal/rag-materials/${id}`, {
        method: "GET",
        headers: { "x-internal-service-key": this.internalKey, Accept: "application/json" },
        redirect: "error",
        signal,
      });
    } catch {
      throw new Error(signal.aborted ? "M2 material request timed out" : "M2 material request failed");
    }

    if (!response.ok && response.status !== 404) {
      throw new Error(`M2 material request failed (HTTP ${response.status})`);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (signal.aborted) throw new Error("M2 material request timed out");
      throw new InvalidOutput("M2 material response must be valid JSON");
    }

    if (response.status === 404) {
      if (isRecord(payload) && payload.success === false && isRecord(payload.error) &&
          payload.error.code === "RESOURCE_NOT_FOUND") return null;
      throw new Error("M2 material endpoint is unavailable or returned an unexpected 404");
    }
    return parseMaterialResponse(payload, id);
  }
}
