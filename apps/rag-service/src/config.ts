export const processingConfig = {
  maxBytes: 10 * 1024 * 1024,
  chunk: {
    limitWords: 300,
    overlapWords: 50,
  },
};

export type ProcessingConfig = typeof processingConfig;

export const embeddingConfig = {
  model: "gemini-embedding-2",
  dimension: 768,
  timeoutMs: 30_000,
  taskFormatVersion: "gemini2-retrieval-v1",
} as const;

export const generationConfig = {
  model: "gemini-3.5-flash-lite",
  timeoutMs: 30_000,
  maxOutputTokens: 2048,
  maxContextCharacters: 30000,
} as const;

export interface RagConfig {
  topK: number;
  minScore: number;
  processing: ProcessingConfig;
  embeddingDim: number;
  embeddingModel: string;
  embeddingTaskFormatVersion: string;
  parserVersion: string;
  chunkerVersion: string;
}

export function defaultRagConfig(): RagConfig {
  return {
    topK: 5,
    minScore: 0.55,
    processing: { ...processingConfig, chunk: { ...processingConfig.chunk } },
    embeddingDim: embeddingConfig.dimension,
    embeddingModel: embeddingConfig.model,
    embeddingTaskFormatVersion: embeddingConfig.taskFormatVersion,
    parserVersion: "utf8-lf-v1",
    chunkerVersion: "markdown-heading-body-offset-v2",
  };
}

export function ragConfigFromEnv(): RagConfig {
  const config = defaultRagConfig();
  const number = (name: string, fallback: number) => {
    const raw = process.env[name];
    const value = raw === undefined ? fallback : Number(raw);
    if ((raw !== undefined && !raw.trim()) || !Number.isFinite(value)) {
      throw new Error(`Invalid ${name}`);
    }
    return value;
  };
  config.topK = number("RAG_TOP_K", config.topK);
  config.minScore = number("RAG_MIN_SCORE", config.minScore);
  config.processing.maxBytes = number("RAG_MAX_BYTES", config.processing.maxBytes);
  config.processing.chunk.limitWords = number("RAG_CHUNK_WORDS", config.processing.chunk.limitWords);
  config.processing.chunk.overlapWords = number("RAG_OVERLAP_WORDS", config.processing.chunk.overlapWords);
  const { limitWords, overlapWords } = config.processing.chunk;
  if (!Number.isSafeInteger(config.topK) || config.topK < 1 || config.topK > 100 ||
      config.minScore < -1 || config.minScore > 1 ||
      !Number.isSafeInteger(config.processing.maxBytes) || config.processing.maxBytes < 1 ||
      !Number.isSafeInteger(limitWords) || limitWords < 1 ||
      !Number.isSafeInteger(overlapWords) || overlapWords < 0 || overlapWords >= limitWords) {
    throw new Error("Invalid RAG retrieval or processing configuration");
  }
  return config;
}
