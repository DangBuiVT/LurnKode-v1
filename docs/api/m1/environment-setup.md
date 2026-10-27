# Thiết lập môi trường — M1 Auth Service

Tài liệu này hướng dẫn chuẩn bị môi trường local cho backend M1. M1 là Auth Service riêng, dùng Bun + ElysiaJS, PostgreSQL + Drizzle, JWT RS256 và JWKS. M1 không cần Redis, LLM, pgvector hay Judge Worker.

> **Trạng thái repo:** `apps/api` hiện mới là skeleton ghi chú `// TODO`; chưa có `package.json`, migration, `.env.example`, Docker Compose hoặc implementation. Vì vậy có thể chuẩn bị runtime, database và key theo hướng dẫn dưới đây, nhưng chưa thể chạy API/migration cho đến khi các TODO tương ứng được triển khai.

## 1. Công cụ cần có

- Git
- Bun (runtime backend theo stack repo)
- PostgreSQL local hoặc PostgreSQL container
- OpenSSL để tạo cặp khóa RSA cho development
- `psql` hoặc GUI quản trị PostgreSQL để tạo database và kiểm tra kết nối

Kiểm tra các công cụ:

```sh
git --version
bun --version
psql --version
openssl version
```

## 2. Chuẩn bị database riêng cho M1

M1 cần database riêng, không dùng chung quyền truy cập database của M2. Tạo database local, ví dụ `lurnkode_m1`:

```sql
CREATE DATABASE lurnkode_m1;
```

Connection string local có dạng:

```text
postgresql://<username>:<password>@localhost:5432/lurnkode_m1
```

Thay username/password bằng thông tin PostgreSQL local của bạn. Không dùng credential mẫu này cho môi trường public hoặc production. Migration/schema sẽ được tạo khi hoàn tất phần bootstrap và Drizzle TODO.

## 3. Tạo key pair RS256 cho development

M1 ký access JWT bằng private key; service consumer chỉ cần public key qua JWKS. Tạo thư mục key local và giữ private key ngoài Git. Tại thư mục `apps/api`:

```sh
mkdir keys
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out keys/jwt-private.pem
openssl pkey -in keys/jwt-private.pem -pubout -out keys/jwt-public.pem
```

- `jwt-private.pem`: chỉ Auth Service được đọc; tuyệt đối không commit, gửi frontend hoặc đưa vào image public.
- `jwt-public.pem`: có thể dùng để build JWKS; không chứa private key.
- Production nên lấy signing key từ secret manager/KMS/HSM phù hợp; không lưu private key trong repo.
- Khi xoay key, giữ public key cũ trong JWKS đủ lâu để token đã ký bằng key cũ hết hạn; dùng `kid` để chọn key.

Nếu OpenSSL chưa được cài, có thể chuẩn bị RSA key bằng công cụ quản lý secret của môi trường triển khai. Không tự dán key thật vào chat hoặc tài liệu commit.

## 4. Cấu hình biến môi trường local

Khi bootstrap app xong, tạo `apps/api/.env` cục bộ (hoặc copy từ `.env.example` nếu file đó đã được tạo). Mẫu biến dự kiến:

```env
NODE_ENV=development
PORT=3001

# Database riêng của Auth Service
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/lurnkode_m1

# Browser origin được phép gọi API; chỉ khai báo origin cần thiết
ALLOWED_ORIGINS=http://localhost:3000

# JWT — tên biến cần được đồng bộ với config schema khi implementation
JWT_ISSUER=http://localhost:3001
JWT_AUDIENCE=lurnkode-services
JWT_ACCESS_TTL_SECONDS=900
JWT_SIGNING_ALGORITHM=RS256
JWT_KEY_ID=local-dev-2026-01
JWT_PRIVATE_KEY_PATH=./keys/jwt-private.pem
JWT_PUBLIC_KEY_PATH=./keys/jwt-public.pem

# Refresh session; TTL = 7 ngày theo thiết kế đề xuất
REFRESH_TOKEN_TTL_SECONDS=604800
REFRESH_COOKIE_NAME=lurnkode_refresh
REFRESH_COOKIE_SECURE=false
REFRESH_COOKIE_SAME_SITE=lax
```

Các tên `JWT_*` và `REFRESH_*` là **đề xuất cho config contract**, chưa được app đọc vì config loader chưa được viết. Hãy giữ thống nhất giữa `.env.example`, validation config, README và deploy secrets khi triển khai.

Local HTTP dùng `REFRESH_COOKIE_SECURE=false` để thử cookie; production bắt buộc HTTPS và `Secure=true`. Nếu refresh token được gửi bằng cookie, cần CSRF protection phù hợp. Không đặt access/refresh token, private key, database URL hay credential vào biến `NEXT_PUBLIC_*`.

## 5. File không được commit

Root `.gitignore` cần bỏ qua:

```gitignore
.env
.env.*
!.env.example
apps/api/keys/
*.pem
```

Chỉ commit `.env.example` với placeholder không bí mật. Trước khi push, kiểm tra `git status` và chắc chắn không có `.env`, private key, token hoặc database credential bị staged.

## 6. Cài dependencies và chạy service

Sau khi M1 bootstrap manifest và scripts, dự kiến quy trình sẽ là:

```sh
cd apps/api
bun install
bun run dev
```

Các lệnh database sẽ được ghi tại đây khi nhóm tạo script thật, ví dụ generate/apply migration. Hiện repo chưa có manifest/script nên các lệnh trên chưa chạy được; không tự tạo migration hoặc kết nối DB trước khi schema M1 được chốt.

Khi app đã chạy, xác minh health endpoint:

```sh
curl http://localhost:3001/health
```

`/health` nằm ngoài `/api/v1` và không yêu cầu đăng nhập. Health response không được trả thông tin secret, DB connection string hoặc private key.

## 7. Thiết lập service consumer (M2)

M2 không cần `DATABASE_URL` của M1 hoặc private signing key. Để xác minh access token, M2 cần contract chính thức gồm:

- JWT issuer (`iss`) và audience (`aud`) chính xác.
- JWKS URL và quy tắc cache/key rotation.
- Role values thống nhất: `Admin`, `Instructor`, `Learner`.
- Thuật toán allowlist RS256 và claim cần kiểm tra: `sub`, `role`, `iss`, `aud`, `iat`, `exp`, `jti`.

M2 phải tự kiểm tra quyền trên dữ liệu M2 (ví dụ course ownership, enrollment và quyền truy cập lesson) sau khi xác minh identity. Không tin `userId`/`role` từ request body.

## 8. Xử lý lỗi thường gặp

| Triệu chứng | Cần kiểm tra |
|---|---|
| Không kết nối được DB | PostgreSQL đang chạy, database `lurnkode_m1` tồn tại, URL/port/user/password đúng |
| API không start do config | Tên biến trong `.env` khớp config schema và mọi key path đọc được |
| JWT verify lỗi | Thuật toán RS256, `kid`, public/private key pair, `iss`, `aud`, thời hạn token và clock hệ thống |
| Browser bị CORS block | `ALLOWED_ORIGINS` phải là origin chính xác gồm scheme/host/port; không thêm path |
| Refresh cookie không gửi local | Kiểm tra domain/path/SameSite và `Secure`; HTTPS cần thiết khi bật `Secure` |
| Health chạy nhưng login chưa được | Skeleton hiện chưa có implementation; kiểm tra TODO/PR bootstrap thay vì suy luận từ health |

## 9. Không đưa vào môi trường M1

Các biến sau thuộc module khác, không cần để chạy Auth Service: `REDIS_URL`, `LLM_PROVIDER`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `JUDGE_WORKER_URL`, `JUDGE_WORKER_AUTH`, pgvector/RAG config và Docker Sandbox config.
