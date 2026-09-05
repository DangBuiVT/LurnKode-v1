---
name: rag-citation
description: Hướng dẫn format citations và source attribution cho DevVerse AI Tutor RAG responses. Bao gồm citation schema, display format, source tracing, và out-of-scope response patterns.
---

# RAG Citation Skill — DevVerse AI Tutor

## Yêu cầu đề bài

- Phải cung cấp citations (exact lesson/slide source)
- Phải handle out-of-scope prompts safely

## 1. Citation Schema

```typescript
interface Citation {
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  courseTitle: string
  sourceType: 'slide' | 'transcript' | 'text'
  slidePage?: number        // for slides
  timestampSeconds?: number // for video transcripts
  excerpt: string           // relevant text snippet (150 chars)
  similarity: number        // 0-1, confidence score
}

interface RAGResponse {
  answer: string
  citations: Citation[]
  isOutOfScope: boolean
  confidence: number        // max similarity score
}
```

## 2. Citation Enrichment

```python
async def enrich_citations(raw_chunks: list[dict]) -> list[dict]:
    """Add lesson/module/course metadata to raw chunk results"""
    lesson_ids = [c['lesson_id'] for c in raw_chunks]

    # Batch fetch lesson metadata
    lessons = supabase.from_('lessons').select(
        'id, title, modules(title, courses(title))'
    ).in_('id', lesson_ids).execute()

    lesson_map = {l['id']: l for l in lessons.data}

    enriched = []
    for chunk in raw_chunks:
        lesson = lesson_map.get(chunk['lesson_id'], {})
        module = lesson.get('modules', [{}])[0]
        course = module.get('courses', {})

        enriched.append({
            **chunk,
            'lesson_title': lesson.get('title', 'Unknown'),
            'module_title': module.get('title', ''),
            'course_title': course.get('title', ''),
        })

    return enriched
```

## 3. Citation Display Format

```typescript
// For UI display
function formatCitation(citation: Citation): string {
  const source = citation.sourceType === 'slide'
    ? `Slide ${citation.slidePage}`
    : citation.timestampSeconds
      ? `Video ${Math.floor(citation.timestampSeconds / 60)}:${String(citation.timestampSeconds % 60).padStart(2, '0')}`
      : 'Nội dung bài học'

  return `📚 ${citation.courseTitle} › ${citation.moduleTitle} › ${citation.lessonTitle} (${source})`
}
```

## 4. Out-of-scope Responses

```python
OUT_OF_SCOPE_RESPONSES = [
    "Câu hỏi này nằm ngoài phạm vi nội dung khóa học. Hãy thử hỏi về bài học cụ thể trong khóa học của bạn!",
    "Tôi chỉ có thể hỗ trợ các câu hỏi liên quan đến nội dung khóa học DevVerse. Câu hỏi của bạn có vẻ không liên quan đến khóa học hiện tại.",
]

def get_out_of_scope_response() -> RAGResponse:
    import random
    return RAGResponse(
        answer=random.choice(OUT_OF_SCOPE_RESPONSES),
        citations=[],
        is_out_of_scope=True,
        confidence=0.0
    )
```

## Khi nào activate skill này

- Format citations cho AI Tutor responses
- Debug missing/wrong citations
- Handle out-of-scope queries
- Design citation UI component
