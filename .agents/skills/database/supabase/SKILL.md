---
name: supabase
description: Hướng dẫn sử dụng Supabase (PostgreSQL managed + Auth + Storage + Realtime) cho DevVerse LMS. Bao gồm RLS policies, Auth patterns, Storage buckets, và pgvector integration.
---

# Supabase Skill — DevVerse LMS

## Mục tiêu

Skill này hướng dẫn cách làm việc với Supabase trong dự án DevVerse.
Supabase = PostgreSQL + Auth + Storage + Realtime + pgvector (qua extension).

## Stack trong DevVerse

```
Supabase Free Tier
├── PostgreSQL 15        ← database chính
├── pgvector extension   ← vector search cho RAG
├── Supabase Auth        ← RBAC: Student/Instructor/Admin
├── Supabase Storage     ← video, slides, attachments
└── Supabase Realtime    ← leaderboard live updates (nếu cần)
```

## 1. Khởi tạo project

```bash
# Cài Supabase CLI
npm install -g supabase

# Init local dev
supabase init
supabase start

# Link to cloud project
supabase link --project-ref <YOUR_PROJECT_REF>
```

## 2. Environment Variables

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # CHỈ dùng server-side, KHÔNG expose client
```

> [!CAUTION]
> `SERVICE_ROLE_KEY` bỏ qua RLS. Chỉ dùng trong backend trusted code. KHÔNG đưa vào frontend.

## 3. Row Level Security (RLS)

**Bật RLS trên MỌI table**:

```sql
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
```

**Pattern cơ bản**:

```sql
-- Student chỉ xem course đã enroll
CREATE POLICY "students_view_enrolled_courses"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.course_id = courses.id
    AND enrollments.user_id = auth.uid()
  )
);

-- Instructor chỉ edit course của mình
CREATE POLICY "instructor_edit_own_courses"
ON courses FOR UPDATE
USING (auth.uid() = instructor_id);
```

## 4. Auth: RBAC với User Metadata

```sql
-- Lưu role vào user metadata khi sign up
-- Server-side:
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: { role: 'student' }  -- 'student' | 'instructor' | 'admin'
})

-- Client-side check:
const { data: { user } } = await supabase.auth.getUser()
const role = user?.user_metadata?.role
```

**RLS với role**:

```sql
-- Admin xem tất cả
CREATE POLICY "admin_full_access"
ON courses FOR ALL
USING (
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);
```

## 5. pgvector — Bật extension

```sql
-- Bật trong Supabase Dashboard > Database > Extensions
-- hoặc migration:
CREATE EXTENSION IF NOT EXISTS vector;

-- Tạo table cho RAG embeddings
CREATE TABLE course_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
  metadata JSONB,          -- {slide_page, timestamp, source}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index cho cosine similarity (nhanh hơn IVFFlat với data nhỏ)
CREATE INDEX ON course_embeddings USING hnsw (embedding vector_cosine_ops);
```

## 6. Storage: Video & Slides

```typescript
// Upload slide PDF
const { data, error } = await supabase.storage
  .from('course-materials')
  .upload(`lessons/${lessonId}/slide.pdf`, file, {
    contentType: 'application/pdf',
    upsert: false
  })

// Tạo signed URL (private access)
const { data: { signedUrl } } = await supabase.storage
  .from('course-materials')
  .createSignedUrl(`lessons/${lessonId}/slide.pdf`, 3600) // 1 hour
```

## 7. Migrations workflow

```bash
# Tạo migration mới
supabase migration new add_course_table

# Apply local
supabase db reset

# Push lên cloud
supabase db push
```

## 8. Client setup (TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'  // generated types

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Server-side (bypass RLS — dùng cẩn thận)
export const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## 9. Generate TypeScript types

```bash
supabase gen types typescript --linked > src/types/database.types.ts
```

## Khi nào activate skill này

- Tạo hoặc sửa database schema
- Viết RLS policies
- Implement authentication/authorization
- Upload/serve files (video, slides)
- Cần vector search cho RAG
- Supabase migration workflow
