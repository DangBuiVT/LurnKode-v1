import { embeddingConfig, ragConfigFromEnv } from "../src/config.ts";
import { AccessDenied, InvalidInput, InvalidOutput, Unauthenticated } from "../src/domain/errors.ts";
import { LmsCourseAccessClient } from "../src/infra/clients/lmsCourseAccessClient.ts";
import { createEmbeddingAdapter } from "../src/infra/embeddings/embeddingAdapter.ts";
import { createLlmAdapter } from "../src/infra/llm/llmAdapter.ts";
import { connectPgvectorStore } from "../src/infra/vector/connection.ts";
import { createAnswerService } from "../src/services/answerService.ts";
import { createRetrievalService, MAX_QUESTION_CHARACTERS } from "../src/services/retrievalService.ts";
import { validateExternalId, validateText } from "../src/services/validation.ts";

function required(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new InvalidInput(`Missing ${name}`);
  return value;
}

try {
  if (process.env.NODE_ENV === "production") throw new InvalidInput("Standalone answer CLI is for local integration only");
  if (process.argv.length !== 4) throw new InvalidInput("Usage: bun scripts/answer.ts <course-uuid> <question>");
  const courseId = validateExternalId(process.argv[2]);
  const question = validateText(process.argv[3], "question").trim();
  if (question.length > MAX_QUESTION_CHARACTERS) throw new InvalidInput("Question exceeds character limit");
  const config = ragConfigFromEnv();
  const access = new LmsCourseAccessClient({
    baseUrl: required("M2_BASE_URL"), bearerToken: required("M1_ACCESS_TOKEN"),
    timeoutMs: process.env.M2_TIMEOUT_MS === undefined ? undefined : Number(process.env.M2_TIMEOUT_MS),
  });
  const learnerId = await access.getLearnerId();
  const embeddings = createEmbeddingAdapter(required("GEMINI_API_KEY"));
  const generator = createLlmAdapter();
  const connection = connectPgvectorStore(required("M4_DATABASE_URL"), embeddingConfig);
  try {
    const retrieval = createRetrievalService({ access, embeddings, vectors: connection.store }, config);
    const answers = createAnswerService({ retrieval, generator });
    console.log(JSON.stringify(await answers.answer({ learnerId, courseId, question }), null, 2));
  } finally {
    await connection.close();
  }
} catch (error) {
  const message = error instanceof InvalidInput || error instanceof InvalidOutput || error instanceof AccessDenied || error instanceof Unauthenticated
    ? error.message : "Check M1/M2 availability, provider credentials and database setup";
  console.error(`Answer failed: ${message}`);
  process.exitCode = 1;
}
