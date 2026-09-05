---
name: pgvector
description: Hướng dẫn sử dụng pgvector extension trong Supabase/PostgreSQL cho RAG pipeline của DevVerse AI Tutor. Bao gồm chunking strategies, embedding generation, HNSW indexing, cosine similarity search, và citation tracing.
---

# pgvector Skill — DevVerse RAG Pipeline

## Mục tiêu

Skill này hướng dẫn triển khai vector search với pgvector cho tính năng AI Tutor (5.1) của DevVerse.

## Pipeline tổng quan

```
Course Content (PDF/Video transcript)
    ↓ 1. Chunking
Text Chunks (512 tokens, 50 overlap)
    ↓ 2. Embedding (OpenAI / local model)
Vectors (1536 dims)
    ↓ 3. Store với metadata
pgvector table + HNSW index
    ↓ 4. Query time: embed question → cosine search
Top-K relevant chunks + citations
    ↓ 5. LLM generation với context
Answer + source attribution
```

## 1. Schema

```sql
-- Bật extension (trong Supabase Dashboard > Extensions)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE course_chunks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id    UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id    UUID REFERENCES courses(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  embedding    vector(1536),   -- OpenAI text-embedding-3-small
  chunk_index  INTEGER,        -- thứ tự chunk trong lesson
  metadata     JSONB NOT NULL DEFAULT '{}',
  -- metadata chứa: {slide_page, start_time, end_time, source_type: 'slide'|'transcript'}
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index (nhanh hơn IVFFlat với data <1M vectors)
CREATE INDEX ON course_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search cho hybrid retrieval
CREATE INDEX ON course_chunks USING gin(to_tsvector('english', content));
```

## 2. Chunking Strategy

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,       # tokens
    chunk_overlap=50,     # overlap để không mất context
    separators=["\n\n", "\n", ".", " "]
)

def chunk_lesson(text: str, lesson_id: str, source_type: str):
    chunks = splitter.split_text(text)
    return [
        {
            "lesson_id": lesson_id,
            "content": chunk,
            "chunk_index": i,
            "metadata": {"source_type": source_type}
        }
        for i, chunk in enumerate(chunks)
    ]
```

## 3. Embedding Generation

```python
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch embedding — tối đa 2048 items/request"""
    response = await client.embeddings.create(
        model="text-embedding-3-small",   # 1536 dims, rẻ nhất
        input=texts
    )
    return [item.embedding for item in response.data]

# Alternative: sentence-transformers local (free, no API cost)
# from sentence_transformers import SentenceTransformer
# model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dims
# embeddings = model.encode(texts, batch_size=32)
```

## 4. Similarity Search

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async def search_similar(
    query: str,
    course_id: str,
    k: int = 5,
    threshold: float = 0.7
) -> list[dict]:
    # Embed query
    query_embedding = (await embed_texts([query]))[0]

    # RPC call to pgvector
    result = supabase.rpc("match_course_chunks", {
        "query_embedding": query_embedding,
        "course_id": course_id,
        "match_count": k,
        "match_threshold": threshold
    }).execute()

    return result.data
```

```sql
-- Supabase function (tạo trong Database > Functions)
CREATE OR REPLACE FUNCTION match_course_chunks(
  query_embedding vector(1536),
  course_id UUID,
  match_count INTEGER DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  lesson_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cc.id,
    cc.lesson_id,
    cc.content,
    cc.metadata,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM course_chunks cc
  WHERE
    cc.course_id = match_course_chunks.course_id
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

## 5. Citation Format (yêu cầu của đề bài)

```python
def format_answer_with_citations(answer: str, sources: list[dict]) -> dict:
    citations = []
    for src in sources:
        lesson = get_lesson(src["lesson_id"])
        citations.append({
            "lesson_id": src["lesson_id"],
            "lesson_title": lesson["title"],
            "source_type": src["metadata"].get("source_type"),
            "slide_page": src["metadata"].get("slide_page"),
            "timestamp": src["metadata"].get("start_time"),
            "excerpt": src["content"][:200] + "..."
        })
    return {
        "answer": answer,
        "citations": citations,
        "confidence": max(src["similarity"] for src in sources)
    }
```

## 6. Out-of-scope Detection

```python
def is_out_of_scope(query_embedding: list[float], threshold: float = 0.5) -> bool:
    """Trả True nếu query không liên quan đến course content"""
    result = supabase.rpc("match_course_chunks", {
        "query_embedding": query_embedding,
        "match_count": 1,
        "match_threshold": threshold
    }).execute()
    return len(result.data) == 0

# Trong RAG handler:
if is_out_of_scope(query_embedding):
    return {"answer": "Câu hỏi này nằm ngoài phạm vi khóa học.", "citations": []}
```

## Khi nào activate skill này

- Implement hoặc debug RAG pipeline
- Thêm content mới vào vector store
- Optimize search performance
- Implement citation/source attribution
- Handle out-of-scope queries
