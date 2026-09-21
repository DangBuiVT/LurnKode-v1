# Database Rules — LurnKode LMS

## Schema Conventions
- Primary keys: UUID (`gen_random_uuid()`)
- Timestamps: `created_at TIMESTAMPTZ DEFAULT NOW()`
- Foreign keys: phải có `ON DELETE CASCADE` hoặc `ON DELETE RESTRICT`
- Tên cột: snake_case
- Tên bảng: plural, snake_case (`courses`, `lessons`, `submissions`)

## ORM — Drizzle ORM
- Schema được định nghĩa bằng Drizzle schema files (TypeScript)
- Migrations quản lý qua Drizzle migration files — không sửa trực tiếp DB
- Migration files phải idempotent (chạy nhiều lần không lỗi)
- KHÔNG sửa migration đã apply — tạo migration mới

## RLS (Row Level Security)
- BẮT BUỘC bật PostgreSQL RLS trên TẤT CẢ tables
- Kiểm tra double: application middleware (RBAC) + database RLS
- Mỗi table phải có policy rõ ràng cho từng role

## Query Performance
- Mọi foreign key phải có index
- pgvector: dùng HNSW index (không IVFFlat) cho dataset nhỏ-vừa
- Avoid N+1: dùng JOIN hoặc batch queries

## pgvector Conventions
- Embedding dimension: phụ thuộc model (ví dụ: 768 hoặc 1536 — pin theo model đã chọn)
- Similarity operator: `<=>` (cosine distance)
- Threshold: similarity >= 0.55 để filter noise
