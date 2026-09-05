---
name: rag-pgvector
description: Hướng dẫn triển khai đầy đủ RAG pipeline cho DevVerse AI Tutor (5.1) sử dụng pgvector + Supabase. Bao gồm ingestion pipeline, retrieval, generation với citations, out-of-scope detection, và RAGAS evaluation setup.
---

# RAG Pipeline Skill — DevVerse AI Tutor (5.1)

## Yêu cầu từ đề bài

- Vector DB: pgvector (qua Supabase extension)
- Sources: course slides + video transcripts
- Citations: phải trả về exact lesson/slide source
- Out-of-scope: xử lý an toàn khi ngoài phạm vi khóa học
- Evaluation: RAGAS metrics (Faithfulness, Answer Relevance)
- So sánh với Vanilla LLM baseline

## Kiến trúc tổng quan

```
[INGESTION PIPELINE]
Slide PDF / Video transcript
    → chunk (512 tokens, 50 overlap)
    → embed (text-embedding-3-small)
    → store in pgvector (Supabase)

[QUERY PIPELINE]
User question
    → embed question
    → pgvector cosine search → top-5 chunks
    → out-of-scope check (threshold 0.5)
    → LLM generation với retrieved context
    → return answer + citations

[EVALUATION]
RAGAS: Faithfulness + Answer Relevance
vs Vanilla LLM (no RAG) baseline
```

## 1. Full RAG Handler

```python
from openai import AsyncOpenAI
from supabase import create_client

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

SYSTEM_PROMPT = """Bạn là AI Tutor của DevVerse Learning Platform.
Chỉ trả lời dựa trên context được cung cấp từ khóa học.
Nếu câu hỏi nằm ngoài phạm vi, hãy nói: "Câu hỏi này nằm ngoài nội dung khóa học."
Luôn trích dẫn nguồn khi sử dụng thông tin."""

async def rag_query(
    question: str,
    course_id: str,
    user_id: str,
    k: int = 5,
    similarity_threshold: float = 0.55
) -> dict:
    # Step 1: Embed question
    embed_response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=question
    )
    question_embedding = embed_response.data[0].embedding

    # Step 2: Retrieve relevant chunks
    result = supabase.rpc("match_course_chunks", {
        "query_embedding": question_embedding,
        "course_id": course_id,
        "match_count": k,
        "match_threshold": similarity_threshold
    }).execute()

    chunks = result.data

    # Step 3: Out-of-scope detection
    if not chunks:
        return {
            "answer": "Câu hỏi này nằm ngoài phạm vi nội dung khóa học của bạn. Hãy thử hỏi về bài học cụ thể!",
            "citations": [],
            "is_out_of_scope": True
        }

    # Step 4: Build context with citations
    context_parts = []
    for i, chunk in enumerate(chunks):
        lesson_info = f"[Nguồn {i+1}: Lesson {chunk['lesson_id']}, {chunk['metadata'].get('source_type', 'content')}]"
        context_parts.append(f"{lesson_info}\n{chunk['content']}")

    context = "\n\n---\n\n".join(context_parts)

    # Step 5: Generate answer
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context từ khóa học:\n{context}\n\nCâu hỏi: {question}"}
    ]

    completion = await openai_client.chat.completions.create(
        model="gpt-4o-mini",    # cost-effective for student project
        messages=messages,
        temperature=0.3,        # lower = more faithful to context
        max_tokens=1024
    )

    answer = completion.choices[0].message.content

    # Step 6: Format citations
    citations = []
    for chunk in chunks:
        citations.append({
            "lesson_id": chunk["lesson_id"],
            "source_type": chunk["metadata"].get("source_type"),
            "slide_page": chunk["metadata"].get("slide_page"),
            "similarity": chunk["similarity"],
            "excerpt": chunk["content"][:150] + "..."
        })

    # Step 7: Log for RAGAS evaluation
    await log_rag_interaction(
        user_id=user_id,
        question=question,
        context=context,
        answer=answer,
        chunks=chunks
    )

    return {
        "answer": answer,
        "citations": citations,
        "is_out_of_scope": False,
        "tokens_used": completion.usage.total_tokens
    }
```

## 2. Vanilla LLM Baseline (để so sánh)

```python
async def vanilla_llm_query(question: str, course_id: str) -> dict:
    """No RAG — dùng để compare với RAG trong RAGAS evaluation"""
    completion = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Bạn là AI Tutor."},
            {"role": "user", "content": question}
        ],
        temperature=0.7
    )
    return {
        "answer": completion.choices[0].message.content,
        "citations": [],
        "is_out_of_scope": False,
        "method": "vanilla_llm"
    }
```

## 3. Ingestion Pipeline

```python
import fitz  # PyMuPDF for PDF

async def ingest_lesson(lesson_id: str, course_id: str, source_type: str):
    if source_type == "slide":
        chunks = await chunk_pdf_slides(lesson_id)
    elif source_type == "transcript":
        chunks = await chunk_video_transcript(lesson_id)

    # Batch embed
    texts = [c["content"] for c in chunks]
    embeddings = await batch_embed(texts, batch_size=100)

    # Insert to Supabase
    rows = [
        {
            "lesson_id": lesson_id,
            "course_id": course_id,
            "content": chunk["content"],
            "embedding": embedding,
            "chunk_index": i,
            "metadata": chunk["metadata"]
        }
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
    ]

    supabase.from_("course_chunks").insert(rows).execute()

async def chunk_pdf_slides(lesson_id: str) -> list[dict]:
    # Lấy slide URL từ Supabase Storage
    slide_path = f"lessons/{lesson_id}/slide.pdf"
    file_bytes = supabase.storage.from_("course-materials").download(slide_path)

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    chunks = []
    for page_num, page in enumerate(doc):
        text = page.get_text()
        if len(text.strip()) > 50:  # Skip empty pages
            chunks.append({
                "content": text,
                "metadata": {
                    "source_type": "slide",
                    "slide_page": page_num + 1
                }
            })
    return chunks
```

## Khi nào activate skill này

- Build AI Tutor feature (component 5.1)
- Ingest new course content vào vector store
- Debug RAG retrieval (bad citations, wrong answers)
- Setup RAGAS evaluation
- Handle out-of-scope questions
