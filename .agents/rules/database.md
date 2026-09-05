# Database Rules — DevVerse LMS

## Schema Conventions
- Primary keys: UUID (gen_random_uuid())
- Timestamps: created_at TIMESTAMPTZ DEFAULT NOW()
- Foreign keys: phải có ON DELETE CASCADE hoặc ON DELETE RESTRICT
- Tên cột: snake_case
- Tên bảng: plural, snake_case (courses, lessons, submissions)

## RLS (Row Level Security)
- BẮT BUỘC bật RLS trên TẤT CẢ tables
- Kiểm tra double: application middleware + RLS
- Test RLS bằng cách set JWT claims trong SQL Editor

## Migrations
- Mọi schema change phải có Supabase migration file
- Migration files phải idempotent (chạy nhiều lần không lỗi)
- KHÔNG sửa migration đã apply — tạo migration mới

## Query Performance
- Mọi foreign key phải có index
- pgvector: dùng HNSW index (không IVFFlat) cho dataset nhỏ
- Avoid N+1: dùng JOIN hoặc batch queries

## pgvector Conventions
- Embedding dimension: 1536 (text-embedding-3-small)
- Similarity operator: <=> (cosine distance)
- Threshold: similarity >= 0.55 để filter noise
