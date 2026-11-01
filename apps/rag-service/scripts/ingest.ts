import { ragConfigFromEnv, embeddingConfig } from "../src/config.ts";
import { createIngestionService } from "../src/services/ingestionService.ts";
import { LmsMaterialClient } from "../src/infra/clients/lmsMaterialClient.ts";
import { createParserRegistry } from "../src/infra/parsers/parserRegistry.ts";
import { createChunkerRegistry } from "../src/infra/chunkers/chunkerRegistry.ts";
import { DocumentChunker } from "../src/infra/chunkers/documentChunker.ts";
import { createEmbeddingAdapter } from "../src/infra/embeddings/embeddingAdapter.ts";
import { connectPgvectorStore } from "../src/infra/vector/connection.ts";
import { InvalidInput, InvalidOutput, SourceVersionConflict } from "../src/domain/errors.ts";
import { validateExternalId } from "../src/services/validation.ts";

if (process.env.NODE_ENV === "production") {
  throw new Error("Standalone ingestion CLI is for local integration only");
}
const materialId = process.argv[2];
if (!materialId || process.argv.length !== 3) throw new Error("Usage: bun scripts/ingest.ts <material-uuid>");
validateExternalId(materialId);

function required(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Missing ${name}`);
  return value;
}

try {
  const config = ragConfigFromEnv();
  const materials = new LmsMaterialClient({
    baseUrl: required("M2_BASE_URL"),
    internalKey: required("M2_INTERNAL_SERVICE_KEY"),
    timeoutMs: process.env.M2_TIMEOUT_MS === undefined ? undefined : Number(process.env.M2_TIMEOUT_MS),
  });
  const embeddings = createEmbeddingAdapter(required("GEMINI_API_KEY"));
  const connection = connectPgvectorStore(required("M4_DATABASE_URL"), embeddingConfig);
  try {
    const ingestion = createIngestionService({
      materials,
      embeddings,
      vectors: connection.store,
      parsers: createParserRegistry(),
      chunker: new DocumentChunker(createChunkerRegistry(), config.processing.chunk),
    }, config);
    console.log(JSON.stringify(await ingestion.ingestDocument(materialId)));
  } finally {
    await connection.close();
  }
} catch (error) {
  const message = error instanceof InvalidInput || error instanceof InvalidOutput || error instanceof SourceVersionConflict
    ? error.message
    : "Check M2 availability, provider credentials and database setup";
  console.error(`Ingestion failed: ${message}`);
  process.exitCode = 1;
}
