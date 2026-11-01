import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { defaultRagConfig, embeddingConfig, generationConfig } from "../src/config.ts";
import { LmsMaterialClient } from "../src/infra/clients/lmsMaterialClient.ts";
import { LmsCourseAccessClient } from "../src/infra/clients/lmsCourseAccessClient.ts";
import { createParserRegistry } from "../src/infra/parsers/parserRegistry.ts";
import { createChunkerRegistry } from "../src/infra/chunkers/chunkerRegistry.ts";
import { DocumentChunker } from "../src/infra/chunkers/documentChunker.ts";
import { createEmbeddingAdapter } from "../src/infra/embeddings/embeddingAdapter.ts";
import { GeminiLlmAdapter } from "../src/infra/llm/llmAdapter.ts";
import { connectPgvectorStore } from "../src/infra/vector/connection.ts";
import { createIngestionService } from "../src/services/ingestionService.ts";
import { createRetrievalService } from "../src/services/retrievalService.ts";
import { createAnswerService } from "../src/services/answerService.ts";
import type { RetrievedChunk } from "../src/domain/retrieval.ts";
import type { GeneratedAnswer } from "../src/services/ports/llmProvider.ts";
import { pythonFundamentals } from "./fixtures/pythonFundamentals.ts";
import { DEMO_CASES, evaluateDemoCase, verifyDemoCitations } from "./demoCases.ts";

function snippet(text: string, limit = 180): string {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--verbose")) throw new Error("Usage: bun scripts/demo.ts [--verbose]");
  const verbose = args.includes("--verbose");
  if (process.env.NODE_ENV === "production") throw new Error("Demo is available only in local development");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) throw new Error("Set GEMINI_API_KEY in apps/rag-service/.env");
  const databaseUrl = process.env.RAG_DEMO_DATABASE_URL ?? "postgres://postgres:rag_demo_local@127.0.0.1:55435/m4_rag_demo";
  const target = new URL(databaseUrl);
  if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.port !== "55435" || target.pathname !== "/m4_rag_demo") {
    throw new Error("Demo requires the dedicated local m4_rag_demo database on port 55435");
  }
  const learnerId = "11111111-1111-4111-8111-111111111111";
  const courseId = "22222222-2222-4222-8222-222222222222";
  const materialId = "33333333-3333-4333-8333-333333333333";
  const source = {
    ...pythonFundamentals, materialId, courseId,
    chapterId: "44444444-4444-4444-8444-444444444444",
    lessonId: "55555555-5555-4555-8555-555555555555",
    type: "markdown", contentUrl: null,
    isRagSource: true, courseStatus: "published",
  };
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === `/internal/rag-materials/${materialId}`) {
      return request.headers.get("x-internal-service-key") === "demo-internal-key"
        ? Response.json({ success: true, data: source }) : new Response(null, { status: 401 });
    }
    if (request.headers.get("authorization") !== "Bearer demo-learner-token") return new Response(null, { status: 401 });
    if (path === "/api/v1/auth/me") return Response.json({ success: true, data: { userId: learnerId, role: "Learner" } });
    if (path === "/api/v1/my/enrollments") return Response.json({ success: true, data: [{ learnerId, courseId, course: { id: courseId, status: "published" } }] });
    return new Response(null, { status: 404 });
  } });
  const raw = postgres(databaseUrl, { max: 1, onnotice() {} });
  const connection = connectPgvectorStore(databaseUrl);
  try {
    console.log("LURNKODE RAG — LOCAL PROTOTYPE");
    console.log("M1/M2: HTTP fixtures | Gemini + PostgreSQL/pgvector: real");
    if (verbose) console.log(`Local services: ${server.url.origin} | Database: ${target.pathname}`);
    await raw.unsafe("DROP SCHEMA IF EXISTS m4_rag CASCADE");
    await raw.unsafe(await readFile(new URL("../src/infra/vector/schema.local.sql", import.meta.url), "utf8"));
    const config = defaultRagConfig();
    console.log(`Retrieval: top ${config.topK} | minimum similarity ${config.minScore} | displaying top ${verbose ? config.topK : 2}`);
    const embeddings = createEmbeddingAdapter();
    let activeTrace: { requests: number; modelStatus?: GeneratedAnswer["status"] } | undefined;
    const generator = new GeminiLlmAdapter({ apiKey, model: process.env.GEMINI_LLM_MODEL }, async (url, init) => {
      if (activeTrace) activeTrace.requests++;
      return fetch(url, init);
    });
    const materials = new LmsMaterialClient({ baseUrl: server.url.href, internalKey: "demo-internal-key" });
    const access = new LmsCourseAccessClient({ baseUrl: server.url.href, bearerToken: "demo-learner-token" });
    const parsers = createParserRegistry();
    const markdownParser = parsers.md;
    parsers.md = { async parse(input) {
      const document = await markdownParser.parse(input);
      console.log(`Parsed: Markdown, ${document.sections.length} source section(s)`);
      return document;
    } };
    const chunker = new DocumentChunker(createChunkerRegistry(), config.processing.chunk);
    console.log(`\nDocument: ${source.title} | ${(source.textContent.match(/\S+/g) ?? []).length} words`);
    const ingestion = createIngestionService({ materials, embeddings, vectors: connection.store,
      parsers, chunker: { async chunk(document) {
        const chunks = await chunker.chunk(document);
        console.log(`Chunks: ${chunks.length} | ${config.processing.chunk.limitWords} words / ${config.processing.chunk.overlapWords} overlap`);
        if (verbose) {
          console.log("Code fences stay intact; the word limit is soft for code blocks.");
          for (const chunk of chunks) {
            console.log(`  Chunk ${chunk.ordinal + 1}: ${(chunk.text.match(/\S+/g) ?? []).length} words | offsets=${chunk.startOffset}..${chunk.endOffset} | ${chunk.headingPath}`);
            console.log(`       Text: ${JSON.stringify(chunk.text)}`);
          }
        }
        return chunks;
      } },
    }, config);
    const indexed = await ingestion.ingestDocument(materialId);
    const [stored] = await raw`SELECT count(*)::int AS chunks, count(embedding)::int AS vectors,
      min(vector_dims(embedding))::int AS minimum_dimension, max(vector_dims(embedding))::int AS maximum_dimension
      FROM m4_rag.rag_chunks WHERE material_id = ${materialId}`;
    const indexes = await raw`SELECT indexdef FROM pg_indexes WHERE schemaname = 'm4_rag' AND indexname = 'chunk_embedding_hnsw'`;
    const hasHnsw = indexes.some(row => row.indexdef.includes("USING hnsw") && row.indexdef.includes("vector_cosine_ops"));
    console.log(`Index: ${indexed.status} | ${stored.chunks} chunks, ${stored.vectors} vectors, ${stored.minimum_dimension}..${stored.maximum_dimension} dimensions | HNSW cosine: ${hasHnsw ? "present" : "missing"}`);
    if (verbose) {
      console.log(`Models: ${embeddingConfig.model} / ${process.env.GEMINI_LLM_MODEL ?? generationConfig.model}`);
      console.log(`Chunker: ${config.chunkerVersion} | Embedding dimensions: ${config.embeddingDim}`);
    }
    const identity = await access.getLearnerId();
    const retrieval = createRetrievalService({ access, embeddings, vectors: connection.store }, config);
    const summary: { case: number; expected: string; actual: string; requests: number; check: string }[] = [];
    for (const [index, testCase] of DEMO_CASES.entries()) {
      console.log(`\nCase ${index + 1} — ${testCase.name}`);
      console.log(`Question: ${testCase.question}`);
      if (verbose) console.log(`Expected: ${testCase.expectedStatus} — ${testCase.expectation}`);
      let hits: RetrievedChunk[] = [];
      const trace: { requests: number; modelStatus?: GeneratedAnswer["status"] } = { requests: 0 };
      activeTrace = trace;
      try {
        const answers = createAnswerService({
          retrieval: { async retrieve(input) {
            const result = await retrieval.retrieve(input);
            hits = result.hits;
            const visibleHits = verbose ? hits : hits.slice(0, 2);
            console.log(`Retrieved: ${hits.length} chunks${hits.length > visibleHits.length ? ` (showing ${visibleHits.length})` : ""}`);
            for (const [rank, hit] of visibleHits.entries()) {
              console.log(`  [R${rank + 1}] score=${hit.score.toFixed(4)} | ${hit.headingPath}`);
              console.log(`       ${snippet(hit.text)}`);
            }
            return result;
          } },
          generator: { async generate(input) {
            const generated = await generator.generate(input);
            trace.modelStatus = generated.status;
            return generated;
          } },
        });
        const result = await answers.answer({ learnerId: identity, courseId, question: testCase.question });
        console.log(`LLM: ${trace.requests ? "called" : "skipped"}${verbose ? ` | HTTP requests: ${trace.requests}${trace.modelStatus ? ` | Model status: ${trace.modelStatus}` : ""}` : ""}`);
        console.log(`Answer (${result.status}): ${result.answer}`);
        const valid = verifyDemoCitations(result, hits);
        console.log(`Citations: ${result.citations.length} (${valid ? "valid" : "INVALID"})`);
        for (const citation of result.citations) {
          const rank = hits.findIndex(hit => hit.id === citation.chunkId) + 1;
          console.log(`  [R${rank}] Source: ${source.courseTitle} → ${source.chapterTitle} → ${source.lessonTitle} → ${citation.materialTitle}`);
          console.log(`       Heading: ${citation.headingPath}`);
          if (verbose) console.log(`       Supporting quote: ${JSON.stringify(citation.snippet)}`);
        }
        if (verbose && result.status === "out_of_scope") console.log("Refusal reason: not provided by answer service.");
        const failures = evaluateDemoCase(testCase, result, hits);
        console.log(`Result: ${failures.length ? "FAIL" : "PASS"}`);
        for (const failure of failures) console.log(`  ${failure}`);
        summary.push({ case: index + 1, expected: testCase.expectedStatus, actual: result.status, requests: trace.requests, check: failures.length ? "FAIL" : "PASS" });
      } catch (error) {
        console.log(`LLM: ${trace.requests ? "called" : "skipped"} | HTTP requests: ${trace.requests}`);
        console.log(`Error: ${error instanceof Error ? error.message : "Unknown failure"}`);
        console.log(`Result: ERROR | Expected: ${testCase.expectedStatus}`);
        summary.push({ case: index + 1, expected: testCase.expectedStatus, actual: "error", requests: trace.requests, check: "ERROR" });
      } finally {
        activeTrace = undefined;
      }
    }
    console.log("\nResults");
    console.table(verbose ? summary : summary.map(row => ({ case: row.case, status: row.actual, result: row.check })));
    console.log(`Overall: ${summary.some(row => row.check !== "PASS") ? "FAIL" : "PASS"} (${summary.filter(row => row.check === "PASS").length}/${summary.length} cases)`);
    console.log("Functional checks only; answer quality requires further evaluation.");
    if (summary.some(row => row.check !== "PASS")) process.exitCode = 1;
  } finally {
    await connection.close();
    await raw.end({ timeout: 5 });
    await server.stop(true);
  }
}

main().catch(error => {
  console.error(`Demo failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});
