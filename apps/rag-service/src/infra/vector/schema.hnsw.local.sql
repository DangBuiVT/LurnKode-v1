CREATE INDEX IF NOT EXISTS chunk_embedding_hnsw ON m4_rag.rag_chunks
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
