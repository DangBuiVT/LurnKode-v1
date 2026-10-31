import { createHash } from "node:crypto";
import type { RagConfig } from "../config.ts";
import type { MaterialSource } from "../domain/material.ts";

export function createSourceVersion(material: MaterialSource, content: string, config: RagConfig): string {
  const payload = [
    "m4-source-v1",
    material.id, material.courseId, material.chapterId, material.lessonId,
    material.title, material.type, material.contentUrl, content,
    config.parserVersion, config.chunkerVersion,
    config.processing.chunk.limitWords, config.processing.chunk.overlapWords,
    config.embeddingModel, config.embeddingDim, config.embeddingTaskFormatVersion,
  ];
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
