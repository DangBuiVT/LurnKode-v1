# Hướng Dẫn Dành Cho Nhà Phát Triển (Developer Guide) — LurnKode Platform

Chào mừng bạn đến với dự án **LurnKode**! Tài liệu này cung cấp toàn bộ hướng dẫn cần thiết giúp các nhà phát triển (Developers) thiết lập môi trường, nắm bắt kiến trúc phân hệ, tuân thủ các quy chuẩn lập trình và thực thi kiểm thử tích hợp trên toàn hệ thống.

---

## 📑 Mục lục

1. [Tổng quan Hệ thống & Phân hệ (Architecture & Modules)](#1-tổng-quan-hệ-thống--phân-hệ)
2. [Cấu trúc Thư mục Monorepo](#2-cấu-trúc-thư-mục-monorepo)
3. [Môi trường Yêu cầu & Cài đặt (Prerequisites)](#3-môi-trường-yêu-cầu--cài-đặt)
4. [Cấu hình Biến Môi trường (Environment Variables)](#4-cấu-hình-biến-môi-trường)
5. [Hướng dẫn Khởi chạy Ứng dụng (Running the Project)](#5-hướng-dẫn-khởi-chạy-ứng-dụng)
   - [Cách 1: Khởi chạy toàn bộ với Docker Compose (Khuyên dùng)](#cách-1-khởi-chạy-toàn-bộ-với-docker-compose)
   - [Cách 2: Khởi chạy phục vụ phát triển (Local Hybrid Mode)](#cách-2-khởi-chạy-phục-vụ-phát-triển-local-hybrid-mode)
6. [Các Ràng buộc Nghiệp vụ Cốt lõi (Core Business Constraints)](#6-các-ràng-buộc-nghiệp-vụ-cốt-lõi)
7. [Chuẩn Giao tiếp & Quy ước API (API Conventions)](#7-chuẩn-giao-tiếp--quy-ước-api)
8. [Quy trình Kiểm thử & QA (Testing & Quality Assurance)](#8-quy-trình-kiểm-thử--qa)
9. [Quy trình Git & Đóng góp Code (Git Workflow & Contribution)](#9-quy-trình-git--đóng-góp-code)
10. [Xử lý Sự cố Thường gặp (Troubleshooting FAQ)](#10-xử-lý-sự-cố-thường-gặp)

---

## 1. Tổng quan Hệ thống & Phân hệ

LurnKode là nền tảng quản lý học tập lập trình tích hợp AI Tutor dựa trên học liệu thực tế (RAG) và hệ thống chấm điểm tự động (Judge Sandbox).

```
                        +----------------------------+
                        |      Next.js Web (M5)      |
                        |   Port 3000 (Host: 3001)   |
                        +--------------+-------------+
                                       |
                           REST API    | CORS + RS256 JWT
                                       v
                        +----------------------------+
                        |      Backend API (M1/M2)   |
                        |   Port 8000 (Bun/Elysia)   |
                        +-------+-------------+------+
                                |             |
              +-----------------+             +------------------+
              |                                                  |
              v                                                  v
+-----------------------------+                    +-----------------------------+
|    PostgreSQL 16 + pgvector  |                    |      Redis 7 (Cache/Queue)  |
|         Port 5432           |                    |          Port 6379          |
+--------------+--------------+                    +--------------+--------------+
               ^                                                  ^
               | Vector context                                   | Job queue
+--------------+--------------+                    +--------------+--------------+
|       RAG Service (M4)      |                    |    Judge Worker (M3/M6)     |
|   /internal/rag-materials   |                    |       Docker Sandbox        |
+-----------------------------+                    +-----------------------------+
```

### Phân công trách nhiệm các Phân hệ (Modules):
- **M1 — Auth & Identity Service**: Quản lý tài khoản, mật khẩu (Argon2id), RBAC (`Learner`, `Instructor`, `Admin`), cấp phát token RS256 JWT và endpoint công khai JWKS (`/.well-known/jwks.json`).
- **M2 — Learning Management**: Quản lý khóa học (Courses, Chapters, Lessons, Materials), tiến độ học tuần tự (Sequential Learning), hỏi đáp thảo luận (Discussions) và thông báo (Notifications).
- **M3 / M6 — Assessment & Code Judge**: Quản lý câu hỏi MCQ & lập trình, hàng đợi chấm bài qua Redis, thực thi code học viên cách ly an toàn bên trong Docker Sandbox.
- **M4 — RAG AI Tutor**: Trích xuất học liệu từ M2 qua API nội bộ bảo mật (`/internal/rag-materials`), lưu trữ vector embedding trên `pgvector`, trả lời câu hỏi kèm trích dẫn (citation) chính xác.
- **M5 — Frontend Web UI**: Ứng dụng Next.js 16 (App Router), cung cấp giao diện Catalog khóa học, phòng học tương tác (Player), Studio tạo khóa học dành cho Giảng viên và Auth context.

---

## 2. Cấu trúc Thư mục Monorepo

```
lurnkode/
├── apps/
│   ├── api/                      # Backend Service (M1 & M2)
│   │   ├── src/
│   │   │   ├── config/           # Cấu hình biến môi trường, key RS256, DB, Redis
│   │   │   ├── db/               # Schema Drizzle ORM & migrations
│   │   │   ├── routes/           # Routes phân hệ: auth, courses, lessons, discussions...
│   │   │   ├── services/         # Nghiệp vụ core: auth, learning, notification...
│   │   │   └── index.ts          # Server entrypoint
│   │   ├── Dockerfile            # Container build cho backend
│   │   └── package.json
│   ├── web/lurnkode-ui/          # Frontend Web Application (M5)
│   │   ├── app/                  # Next.js App Router (catalog, course, studio, auth)
│   │   ├── components/           # UI Components (shadcn, player, studio builder...)
│   │   ├── lib/                  # API client, token helpers, state store
│   │   ├── Dockerfile            # Multi-stage container build (Node.js runner)
│   │   └── package.json
│   └── rag-service/              # Phân hệ AI RAG (M4)
├── docs/                         # Tài liệu thiết kế & đặc tả kiến trúc
├── scripts/
│   └── test-production-integration.ts  # Bộ kiểm thử tích hợp tự động (28 E2E scenarios)
├── docker-compose.yml            # Khởi chạy full stack local / production
├── DEVELOPER_GUIDE.md            # Tài liệu này
└── README.md                     # Tổng quan dự án
```

---

## 3. Môi trường Yêu cầu & Cài đặt

### Các công cụ bắt buộc:
1. **Bun runtime** (>= 1.1.x): Khuyên dùng cho backend và chạy scripts.  
   - Windows (PowerShell): `powershell -c "irm bun.sh/install.ps1 | iex"`  
   - macOS / Linux: `curl -fsSL https://bun.sh/install | bash`
2. **Node.js** (>= 20.x LTS): Dùng cho Next.js build & standalone runner.
3. **Docker & Docker Compose** (Docker Desktop trên Windows/macOS hoặc Docker Engine trên Linux).
4. **Git**: Phiên bản mới nhất.

### Cài đặt Dependencies:

```bash
# 1. Cài đặt cho Backend
cd apps/api
bun install

# 2. Cài đặt cho Frontend
cd ../web/lurnkode-ui
bun install   # hoặc npm install
```

---

## 4. Cấu hình Biến Môi trường

Dự án cung cấp cấu hình chuẩn hóa qua file `.env` hoặc trực tiếp trong `docker-compose.yml`.

### 4.1. Biến môi trường Backend (`apps/api/.env`)

| Tên biến | Ví dụ mặc định | Mô tả |
| :--- | :--- | :--- |
| `PORT` | `8000` | Cổng HTTP server |
| `DATABASE_URL` | `postgresql://lurnkode_user:lurnkode_password@localhost:5432/lurnkode_db` | URL kết nối PostgreSQL |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Whitelist Origin cho CORS |
| `INTERNAL_SERVICE_KEY` | `lurnkode_internal_secret_key_m4` | Khóa xác thực cho service nội bộ (M4 RAG) |
| `JWT_KEY_ID` | `m1-auth-key-v1` | Key ID định danh cặp khóa RS256 |
| `JWT_ISSUER` | `https://lurnkode.local/m1` | Issuer gắn trong JWT payload |
| `JWT_ACCESS_TOKEN_TTL`| `900` | Thời hạn Access Token (giây) — 15 phút |
| `JWT_REFRESH_TOKEN_TTL`| `604800` | Thời hạn Refresh Token (giây) — 7 ngày |
| `JWT_PRIVATE_KEY_BASE64`| *(Chuỗi Base64 khóa RSA Private)* | Dùng ký Access Token RS256 |
| `JWT_PUBLIC_KEY_BASE64` | *(Chuỗi Base64 khóa RSA Public)* | Dùng xác minh và xuất bản qua JWKS |

### 4.2. Biến môi trường Frontend (`apps/web/lurnkode-ui/.env.local`)

| Tên biến | Mặc định | Mô tả |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Địa chỉ Backend API cho các fetch request phía client & SSR |

---

## 5. Hướng dẫn Khởi chạy Ứng dụng

### Cách 1: Khởi chạy toàn bộ với Docker Compose (Khuyên dùng)

Cách nhanh nhất để đưa toàn bộ stack (Database, Cache, API, UI) lên hoạt động đồng bộ:

```bash
# Build và chạy ngầm toàn bộ dịch vụ
docker compose up -d --build
```

Kiểm tra trạng thái các container:
```bash
docker compose ps
```

Các dịch vụ sẽ sẵn sàng tại:
- **Frontend Web UI**: [http://localhost:3001](http://localhost:3001) *(Ánh xạ cổng host 3001 để tránh xung đột với các service khác)*
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Public JWKS**: [http://localhost:8000/.well-known/jwks.json](http://localhost:8000/.well-known/jwks.json)
- **PostgreSQL**: `localhost:5432` (`lurnkode_user` / `lurnkode_password` / `lurnkode_db`)
- **Redis**: `localhost:6379`

Dừng hệ thống:
```bash
docker compose down
```

---

### Cách 2: Khởi chạy phục vụ phát triển (Local Hybrid Mode)

Dành cho nhà phát triển muốn sửa code và nhận hot-reload tức thì trên máy cá nhân:

**Bước 1: Chạy Database và Redis bằng Docker:**
```bash
docker compose up -d postgres redis
```

**Bước 2: Cập nhật Schema Database (Drizzle):**
```bash
cd apps/api
bun run db:push
```

**Bước 3: Chạy Backend API (Watch mode):**
```bash
cd apps/api
bun run dev
# API chạy tại http://localhost:8000
```

**Bước 4: Chạy Frontend Web (Next.js Turbopack):**
```bash
cd apps/web/lurnkode-ui
bun dev
# UI chạy tại http://localhost:3000 hoặc http://localhost:3001
```

---

## 6. Các Ràng buộc Nghiệp vụ Cốt lõi (Core Business Constraints)

Tất cả các thành viên phát triển API và Frontend **bắt buộc tuân thủ** các quy tắc sau:

1. **RBAC & Định danh (M1)**:
   - Đăng ký công khai (`/api/v1/auth/register`) mặc định gán role `Learner`.
   - Access token sử dụng thuật toán **RS256** với TTL 15 phút.
   - Chỉ tài khoản có role `Instructor` hoặc `Admin` mới được phép tạo, sửa, xóa hoặc publish khóa học (`/api/v1/courses`).

2. **Ràng buộc Chống tự ghi danh — Constraint 2**:
   - Giảng viên tạo khóa học **không được phép** tự enroll vào chính khóa học của mình.
   - Khi cố tình enroll, API trả về `403 Forbidden` kèm mã lỗi nghiệp vụ:
     ```json
     {
       "error": {
         "code": "SELF_ENROLLMENT_FORBIDDEN",
         "message": "Instructor cannot enroll in their own course"
       }
     }
     ```

3. **Ràng buộc Học tuần tự — Constraint 4**:
   - Khóa học áp dụng quy tắc tuần tự nghiêm ngặt (Sequential Progression): Học viên **không được nhảy cóc** sang bài học tiếp theo nếu chưa hoàn thành bài học trước đó trong cùng chương hoặc khóa.
   - Khi truy cập bài học chưa được phép, API trả về `403 Forbidden`:
     ```json
     {
       "error": {
         "code": "SEQUENTIAL_PREREQUISITE_FAILED",
         "message": "Previous lesson must be completed before accessing this lesson"
       }
     }
     ```
   - Khi hoàn thành bài học, client gọi `POST /api/v1/lessons/:id/complete` để cập nhật `lastAccessedLessonId` và tiến độ.

4. **Bảo mật Học liệu RAG AI (M4)**:
   - Chỉ các tài liệu có cờ `isRagSource: true` thuộc các khóa học đã `published` mới được đưa vào dữ liệu huấn luyện RAG.
   - Endpoint export học liệu `/internal/rag-materials` bắt buộc header `x-internal-service-key`. Client ngoài hoặc học viên không thể truy cập trực tiếp.

---

## 7. Chuẩn Giao tiếp & Quy ước API

- **Base URL**: `/api/v1` (ngoại trừ `/health` và `/.well-known/jwks.json`).
- **Header Xác thực**: `Authorization: Bearer <access_token>`.
- **Cấu trúc Response Chuẩn**:
  - Khi thành công (`200 OK`, `201 Created`):
    ```json
    {
      "data": { ... }
    }
    ```
  - Khi có phân trang:
    ```json
    {
      "data": [ ... ],
      "meta": { "total": 100, "page": 1, "pageSize": 20 }
    }
    ```
  - Khi có lỗi (`400`, `401`, `403`, `404`, `409`, `500`):
    ```json
    {
      "error": {
        "code": "MA_LOI_VIET_HOA_SNAKE_CASE",
        "message": "Mô tả lỗi dễ hiểu cho người dùng",
        "details": null
      }
    }
    ```

---

## 8. Quy trình Kiểm thử & QA

Để đảm bảo các sửa đổi code không làm gãy hệ thống hoặc phá vỡ các hợp đồng API giữa M1, M2, M4 và M5, dự án tích hợp bộ kiểm thử tích hợp tự động hóa:

### Chạy Bộ Kiểm thử Tích hợp Production E2E:
Tập lệnh [`scripts/test-production-integration.ts`](file:///d:/apps/lurnkode/lurnkode-develop/scripts/test-production-integration.ts) kiểm tra toàn bộ 28 kịch bản từ kết nối container, CORS, cấp token, authoring, catalog, sequential progress đến discussions & notifications:

```bash
bun run scripts/test-production-integration.ts
```

*Tiêu chí vượt qua: Toàn bộ 28 kịch bản đều đạt trạng thái `[✔ PASS]` (100% Pass Rate).*

### Chạy Unit Test Backend:
```bash
cd apps/api
bun test
```

### Kiểm tra Kiểu dữ liệu (Typecheck):
```bash
cd apps/api && bun run typecheck
cd ../web/lurnkode-ui && bun run lint
```

---

## 9. Quy trình Git & Đóng góp Code

1. **Chiến lược Phân nhánh (Branching Strategy)**:
   - Nhánh chính: `main` (hoặc `develop` cho bản phát triển chung).
   - Nhánh tính năng:
     - `feature/m1-auth-<ten-chuc-nang>`
     - `feature/m2-learning-<ten-chuc-nang>`
     - `feature/m3-assessment-<ten-chuc-nang>`
     - `feature/m4-rag-<ten-chuc-nang>`
     - `feature/m5-ui-<ten-chuc-nang>`
     - `fix/<mo-ta-loi>`

2. **Quy ước Commit Message (Conventional Commits)**:
   - `feat(m1): implement refresh token rotation`
   - `feat(m2): enforce sequential learning progression check`
   - `feat(m5): add course curriculum player sidebar`
   - `fix(api): correct CORS preflight credentials response`
   - `test(e2e): add test case for instructor self-enrollment rejection`
   - `docs: update developer guide with docker setup instructions`

3. **Checklist trước khi tạo Pull Request**:
   - [ ] Đã chạy linter và typecheck không báo lỗi (`bun run typecheck`).
   - [ ] Đã chạy kiểm thử tích hợp đạt 100% (`bun run scripts/test-production-integration.ts`).
   - [ ] Không commit file `.env` chứa secret vào git.
   - [ ] Giữ nguyên các comment và docstring hiện có.

---

## 10. Xử lý Sự cố Thường gặp (Troubleshooting FAQ)

### Q1: Cổng `3000` bị báo lỗi "port is already allocated"?
- **Nguyên nhân**: Một process hoặc container khác trên máy đang chiếm cổng 3000.
- **Khắc phục**: `docker-compose.yml` của dự án đã cấu hình ánh xạ cổng host sang `3001:3000`. Hãy truy cập web tại [http://localhost:3001](http://localhost:3001).

### Q2: Lỗi Next.js build `TypeError: Expected CommonJS module to have a function wrapper` trên Docker?
- **Nguyên nhân**: Phiên bản Bun trên môi trường Alpine Linux có sự không tương thích với Turbopack worker của Next.js.
- **Khắc phục**: File `apps/web/lurnkode-ui/Dockerfile` đã được tối ưu: dùng `oven/bun` để cài đặt dependencies cực nhanh, và dùng `node:20-alpine` cho công đoạn build và standalone server runner.

### Q3: Gặp lỗi CORS khi gọi API từ Frontend?
- **Khắc phục**: Kiểm tra biến `ALLOWED_ORIGINS` trong `apps/api/.env` hoặc `docker-compose.yml`. Đảm bảo có cả `http://localhost:3000` và `http://localhost:3001`. Khi dùng `fetch`, luôn thêm `{ credentials: 'include' }` nếu cần gửi kèm cookie xác thực.

### Q4: Làm thế nào để reset toàn bộ dữ liệu kiểm thử trong Database?
- Chạy lệnh dọn dẹp container volume:
  ```bash
  docker compose down -v
  docker compose up -d
  ```

---
*Nếu bạn gặp vấn đề phát sinh chưa có trong hướng dẫn này, vui lòng liên hệ Tech Lead hoặc tạo thảo luận trên kênh trao đổi của nhóm.*

