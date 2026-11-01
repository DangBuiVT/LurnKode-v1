# Tài Liệu Tổng Hợp Kiến Trúc & Vận Hành: Backend API (`apps/api`)
## Phân Hệ M1 (Auth & Identity) & M2 (Learning Management)

> **Dự án:** LurnKode — AI-Assisted Learning Platform  
> **Thư mục:** `apps/api`  
> **Phiên bản:** `v0.1.0` (Cập nhật tích hợp M1 + M2)  
> **Thời gian cập nhật:** Tháng 10/2026  
> **Stack chính:** Bun + ElysiaJS v1.4 + TypeScript + PostgreSQL + Drizzle ORM + Jose (RS256 JWT) + Argon2id + Swagger

---

## 1. Tổng Quan & Vai Trò Trong Hệ Sinh Thái LurnKode

`apps/api` hiện là backend dịch vụ tích hợp hai phân hệ nền tảng quan trọng nhất của LurnKode:
1. **M1 — Auth & Identity Service:** Quản lý danh tính, xác thực phi tập trung bằng JWT RS256, quản lý phiên đăng nhập (Refresh Sessions) và phân quyền toàn cục (Global RBAC).
2. **M2 — Learning Management Service:** Quản lý nội dung chương trình học (Curriculum), tiến trình học tập tuần tự (Sequential Progression), thảo luận (Discussions), thông báo (Notifications), và cung cấp API nội bộ cho phân hệ M4 (AI Tutor / RAG).

Toàn bộ API được tài liệu hóa tự động bằng **Swagger OpenAPI UI** tại đường dẫn `/docs`.

```
               ┌────────────────────────────────────────────────────────┐
               │                  CLIENTS (Web / Apps)                  │
               └───────────────┬────────────────────────┬───────────────┘
                               │                        │
                 (1) Auth / Token Requests   (2) Curriculum / Study Requests
                               │                        │
                               ▼                        ▼
               ┌────────────────────────────────────────────────────────┐
               │                 ElysiaJS Backend App                   │
               │                   (apps/api :8000)                     │
               │                                                        │
               │  ┌──────────────────────┐    ┌──────────────────────┐  │
               │  │ M1 — Auth & Identity │    │ M2 — Learning Mgmt   │  │
               │  │  - Login / Register  │    │  - Courses / Lessons │  │
               │  │  - RS256 JWT Issuing │◄───┤  - Sequential Access │  │
               │  │  - JWKS Endpoint     │ (Auth Bridge: Token Verify)│ │
               │  │  - Refresh Sessions  │    │  - Discussions / Noti│  │
               │  └──────────┬───────────┘    └──────────┬───────────┘  │
               └─────────────┼───────────────────────────┼──────────────┘
                             │                           │
                             ▼                           ▼
               ┌────────────────────────────────────────────────────────┐
               │             PostgreSQL Database Engine                 │
               │  - users, refresh_sessions                             │
               │  - courses, chapters, lessons, materials               │
               │  - enrollments, discussions, notifications             │
               └────────────────────────────────────────────────────────┘
                                                         ▲
                                                         │ (X-Internal-Service-Key)
                                              ┌──────────┴──────────┐
                                              │   M4 AI Tutor/RAG   │
                                              │ (/internal/rag-mat) │
                                              └─────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục & Tổ Chức Mã Nguồn

```
apps/api/
├── .env.example                       # Mẫu cấu hình biến môi trường
├── bunfig.toml                        # Cấu hình Bun runtime & package manager
├── drizzle.config.ts                  # Cấu hình Drizzle Kit migrations
├── package.json                       # Scripts, dependencies (Elysia 1.4, Swagger, Drizzle)
├── tsconfig.json                      # Cấu hình TypeScript compiler
├── README.md                          # Tài liệu RFC thiết kế phân hệ
├── report_work.md                     # Báo cáo tiến độ triển khai
├── OVERVIEW.md                        # Tài liệu tổng hợp kiến trúc & hướng dẫn vận hành
│
├── src/
│   ├── index.ts                       # Điểm khởi động HTTP Server & Graceful Shutdown
│   ├── app.ts                         # Lắp ráp Elysia App: Swagger, CORS, M1 routes, M2 module
│   │
│   ├── config/
│   │   └── env.ts                     # Kiểm tra và nạp biến môi trường tập trung (Fail-fast)
│   │
│   ├── types/                         # [Layer 1] Định nghĩa Type, Enum Role, Principal, Claims
│   │   └── index.ts
│   │
│   ├── utils/                         # [Layer 1] Tiện ích hạ tầng
│   │   ├── errors.ts                  # AppError & Factory tạo HTTP Errors (M2)
│   │   ├── http-error.ts              # HttpError chuẩn hóa (M1)
│   │   ├── logger.ts                  # Logger che giấu thông tin nhạy cảm ([REDACTED])
│   │   ├── pagination.ts              # Xử lý & chuẩn hóa phân trang an toàn
│   │   └── response.ts                # Envelope phản hồi chuẩn (ok, fail, paginated)
│   │
│   ├── db/                            # [Layer 1] Cơ sở dữ liệu & Schemas
│   │   ├── index.ts                   # Kết nối PostgreSQL Pool & Drizzle client
│   │   ├── schema/
│   │   │   ├── index.ts               # Export toàn bộ schemas
│   │   │   ├── users.ts               # Bảng users & enums role, status (M1)
│   │   │   ├── refresh-sessions.ts    # Bảng refresh_sessions (M1)
│   │   │   ├── m1-users.schema.ts     # Bảng instructors, learners ánh xạ vai trò (M2)
│   │   │   └── m2-learning.schema.ts  # Bảng courses, chapters, lessons, materials, enrollments, discussions, notifications
│   │   └── migrations/
│   │       ├── 0000_salty_lady_vermin.sql   # Migration khởi tạo M1
│   │       └── 0001_unique_black_bolt.sql   # Migration tích hợp M2
│   │
│   ├── plugins/                       # [Layer 2] Plugins mở rộng Elysia
│   │   ├── auth.ts                    # Khởi tạo TokenService từ khóa RS256
│   │   ├── database.ts                # Đưa kết nối DB vào context
│   │   └── error-handler.ts           # Xử lý ngoại lệ toàn cục ({ as: "global" })
│   │
│   ├── repositories/                  # [Layer 3] Tầng truy vấn DB của M1
│   │   ├── user.repository.ts         # Quản lý users (Advisory Lock chống race condition)
│   │   └── session.repository.ts      # Quản lý phiên làm việc & xoay vòng refresh token
│   │
│   ├── services/                      # [Layer 3 & 4] Nghiệp vụ M1
│   │   ├── token.service.ts           # Ký/Verify JWT RS256, sinh JWKS, SHA-256 tokens
│   │   ├── auth.service.ts            # Đăng ký, đăng nhập (Argon2id), đổi mật khẩu
│   │   ├── session.service.ts         # Xoay vòng token, phát hiện Replay attack
│   │   └── user.service.ts            # Xem/sửa hồ sơ, admin duyệt danh sách người dùng
│   │
│   ├── schemas/                       # [Layer 4] TypeBox Schemas của M1
│   │   ├── auth.schema.ts
│   │   ├── user.schema.ts
│   │   └── index.ts
│   │
│   ├── middlewares/                   # [Layer 5] Bộ lọc bảo mật HTTP
│   │   ├── authentication.ts          # Bearer JWT verification (M1 core)
│   │   ├── authorization.ts           # RBAC check (M1 core)
│   │   ├── auth.middleware.ts         # Bridge M1 identity sang M2 (requireAuth, requireRoles)
│   │   └── internal.middleware.ts     # Kiểm tra X-Internal-Service-Key cho gọi nội bộ
│   │
│   ├── routes/                        # [Layer 5] Định tuyến HTTP REST của M1
│   │   ├── health.routes.ts           # GET /health
│   │   ├── jwks.routes.ts             # GET /.well-known/jwks.json, GET /api/v1/auth/jwks
│   │   ├── auth.routes.ts             # /api/v1/auth/*
│   │   └── users.routes.ts            # /api/v1/users/*
│   │
│   └── modules/                       # [Feature Module] Phân hệ nghiệp vụ độc lập
│       └── m2-learning/               # Toàn bộ logic phân hệ M2
│           ├── index.ts               # Định tuyến gốc M2 & GET /api/v1/m2/status
│           ├── courses/               # Quản lý Courses, Chapters, Lessons, Materials
│           │   ├── course.routes.ts
│           │   ├── course.schema.ts
│           │   └── course.service.ts
│           ├── enrollments/           # Quản lý ghi danh & học tuần tự (Sequential Access)
│           │   ├── enrollment.routes.ts
│           │   ├── enrollment.schema.ts
│           │   └── enrollment.service.ts
│           ├── interactions/          # Thảo luận đa cấp & Thông báo
│           │   ├── interaction.routes.ts
│           │   ├── interaction.schema.ts
│           │   └── interaction.service.ts
│           └── internal/              # API trích xuất tài liệu RAG cho M4
│               ├── internal.routes.ts
│               └── internal.service.ts
│
└── tests/
    ├── unit/                          # Unit tests các services, utils, middlewares M1
    ├── integration/                   # Integration tests các routes M1
    └── m2-learning/
        └── m2.test.ts                 # Test tích hợp luồng toàn diện M1 + M2 (460+ dòng)
```

---

## 3. Chi Tiết Phân Hệ M1 — Auth & Identity Service

### 3.1. Chức năng chính
* **Đăng ký (`Learner`) & Đăng nhập:** Mã hóa mật khẩu an toàn với **Argon2id**. Báo lỗi generic `"Invalid credentials"` chống dò quét tài khoản.
* **Cấp phát JWT RS256:** Access Token sống **15 phút**, mang `userId`, `role` (`Admin`, `Instructor`, `Learner`).
* **Endpoint JWKS:** Public key được công bố tại `/.well-known/jwks.json` và `/api/v1/auth/jwks` với cache header.
* **Refresh Sessions (RFC 6749):**
  * Sống **7 ngày**, lưu dạng chuỗi băm **SHA-256** trong DB.
  * Hỗ trợ lưu trữ qua **HttpOnly; Secure; SameSite=Lax Cookie** hoặc qua body.
  * **Token Rotation:** Cấp token mới và đánh dấu `consumed_at` cho token cũ.
  * **Reuse Detection & Family Revocation:** Nếu phát hiện token cũ đã tiêu thụ bị tái sử dụng, lập tức thu hồi toàn bộ nhóm token (`family_id`).
* **Admin User Management:** Quản lý tài khoản, thay đổi quyền hệ thống và khóa/mở khóa tài khoản. Có **Advisory Lock (`pg_advisory_xact_lock`)** bảo vệ không để mất quản trị viên cuối cùng.

### 3.2. Danh sách Endpoints M1
| Method | Endpoint | Quyền hạn | Mục đích |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness check hệ thống |
| `GET` | `/.well-known/jwks.json` | Public | Public Key Set phục vụ xác thực JWT liên service |
| `GET` | `/api/v1/auth/jwks` | Public | Alias cung cấp JWKS (có `Cache-Control`) |
| `POST` | `/api/v1/auth/register` | Public | Đăng ký tài khoản Learner |
| `POST` | `/api/v1/auth/login` | Public | Đăng nhập (cấp Access Token + set HttpOnly Refresh Cookie) |
| `POST` | `/api/v1/auth/refresh` | Public / Cookie | Xoay vòng Refresh Token & cấp Access Token mới |
| `GET` | `/api/v1/auth/me` | Bearer Token | Lấy thông tin định danh caller (`userId`, `role`) |
| `POST` | `/api/v1/auth/logout` | Bearer / Cookie | Thu hồi phiên đăng nhập |
| `PATCH`| `/api/v1/auth/password` | Bearer Token | Đổi mật khẩu (tự động thu hồi mọi phiên cũ) |
| `GET` | `/api/v1/users/me` | Bearer Token | Xem hồ sơ cá nhân |
| `PATCH`| `/api/v1/users/me` | Bearer Token | Sửa hồ sơ cá nhân (`fullName`, `avatarUrl`) |
| `GET` | `/api/v1/users` | **Admin** | Tra cứu danh sách người dùng (phân trang & lọc) |
| `POST` | `/api/v1/users` | **Admin** | Admin tạo người dùng có phân quyền |
| `GET` | `/api/v1/users/:id` | Bearer / Admin | Xem chi tiết thông tin người dùng |
| `PATCH`| `/api/v1/users/:id` | Bearer / Admin | Sửa thông tin người dùng |
| `PATCH`| `/api/v1/users/:id/role` | **Admin** | Cập nhật vai trò hệ thống (`Admin`, `Instructor`, `Learner`) |
| `PATCH`| `/api/v1/users/:id/status`| **Admin** | Khóa hoặc kích hoạt tài khoản (`active`, `locked`) |

---

## 4. Chi Tiết Phân Hệ M2 — Learning Management Service

Phân hệ M2 phụ trách toàn bộ trải nghiệm học tập và giảng dạy của LurnKode:

### 4.1. Cấu trúc học liệu (Curriculum Hierarchy)
Mô hình dữ liệu khóa học được thiết kế phân cấp chặt chẽ:
$$\text{Course} \longrightarrow \text{Chapters} \longrightarrow \text{Lessons} \longrightarrow \text{Materials}$$

* **Course:** Trạng thái `draft` hoặc `published`. Chỉ `Instructor` sở hữu hoặc `Admin` mới có quyền chỉnh sửa/xóa.
* **Chapter:** Nhóm các bài học theo thứ tự (`orderIndex`). Ràng buộc duy nhất `(courseId, orderIndex)`.
* **Lesson:** Bài học cụ thể theo thứ tự trong chương (`orderIndex`). Ràng buộc duy nhất `(chapterId, orderIndex)`.
* **Material:** Học liệu đính kèm bài học (`video`, `markdown`, `slide`). Cờ `isRagSource: boolean` đánh dấu học liệu dùng làm tri thức cho AI Tutor.

### 4.2. Học tập tuần tự (Sequential Learning Progression)
* Học viên ghi danh khóa học qua `POST /api/v1/courses/:id/enroll`.
* Hệ thống lưu trữ tiến độ qua trường `lastAccessedLessonId` trên bảng `enrollments`.
* Khi gọi `GET /api/v1/lessons/:id/access`, hệ thống áp dụng thuật toán kiểm tra tiến độ:
  * Cho phép truy cập bài học đầu tiên của khóa học.
  * Cho phép truy cập bài học tiếp theo liền kề sau bài học đã hoàn thành gần nhất.
  * Chặn đứng (`403 FORBIDDEN` - `SEQUENTIAL_ACCESS_VIOLATION`) nếu học viên cố tình nhảy cóc bỏ qua các bài học trước đó.
* Hoàn thành bài học qua `POST /api/v1/lessons/:id/complete` để mở khóa bài học kế tiếp.

### 4.3. Thảo luận (Discussions) & Thông báo (Notifications)
* Hỗ trợ thảo luận phân nhánh/lồng nhau (Threaded/Tree discussions) theo từng bài học qua khóa ngoại `parentId`.
* Tự động tạo bản ghi trong bảng `notifications` khi có tương tác cần nhắc nhở người học.
* API xem danh sách thông báo và đánh dấu đã đọc (`PATCH /api/v1/notifications/:id/read`).

### 4.4. Tích hợp RAG AI Tutor (M4 Knowledge Ingestion)
* Endpoint nội bộ `GET /internal/rag-materials` cho phép service M4 truy xuất toàn bộ học liệu có cờ `isRagSource = true` kèm theo ngữ cảnh đầy đủ: Tên khóa học, Tên chương, Tên bài học.
* Được bảo vệ nghiêm ngặt bằng token bí mật nội bộ qua header `X-Internal-Service-Key`.

### 4.5. Danh sách Endpoints M2
| Nhóm | Method | Endpoint | Quyền hạn | Mô tả |
|---|---|---|---|---|
| **Trạng thái** | `GET` | `/api/v1/m2/status` | Public | Kiểm tra trạng thái module M2 |
| **Khóa học** | `POST` | `/api/v1/courses` | Instructor, Admin | Tạo khóa học mới |
| | `GET` | `/api/v1/courses` | Public | Danh sách khóa học đã phát hành (Search & Phân trang) |
| | `GET` | `/api/v1/courses/:id` | Public | Xem chi tiết nội dung chương trình học |
| | `PATCH` | `/api/v1/courses/:id` | Instructor (Owner), Admin | Cập nhật thông tin/trạng thái khóa học |
| | `DELETE`| `/api/v1/courses/:id` | Instructor (Owner), Admin | Xóa khóa học |
| **Chương học** | `POST` | `/api/v1/courses/:id/chapters` | Instructor, Admin | Thêm chương vào khóa học |
| | `PATCH` | `/api/v1/chapters/:id` | Instructor, Admin | Sửa tên/thứ tự chương |
| | `DELETE`| `/api/v1/chapters/:id` | Instructor, Admin | Xóa chương học |
| **Bài học** | `POST` | `/api/v1/chapters/:id/lessons` | Instructor, Admin | Thêm bài học vào chương |
| | `PATCH` | `/api/v1/lessons/:id` | Instructor, Admin | Sửa tên/thứ tự bài học |
| | `DELETE`| `/api/v1/lessons/:id` | Instructor, Admin | Xóa bài học |
| **Học liệu** | `POST` | `/api/v1/lessons/:id/materials`| Instructor, Admin | Thêm học liệu (video, markdown, slide) |
| | `PATCH` | `/api/v1/materials/:id` | Instructor, Admin | Cập nhật nội dung/cờ RAG học liệu |
| | `DELETE`| `/api/v1/materials/:id` | Instructor, Admin | Xóa học liệu |
| **Ghi danh & Tiến độ** | `POST` | `/api/v1/courses/:id/enroll` | **Learner** | Ghi danh vào khóa học |
| | `GET` | `/api/v1/my/enrollments` | **Learner** | Danh sách các khóa học đã ghi danh |
| | `GET` | `/api/v1/lessons/:id/access` | Learner (Enrolled), Inst, Admin | Kiểm tra quyền truy cập bài học tuần tự & lấy học liệu |
| | `POST` | `/api/v1/lessons/:id/complete`| **Learner** | Đánh dấu bài học đã hoàn thành |
| **Thảo luận** | `GET` | `/api/v1/lessons/:id/discussions` | Đã đăng nhập | Danh sách thảo luận bài học (cấu trúc cây) |
| | `POST` | `/api/v1/lessons/:id/discussions` | Đã đăng nhập | Đăng bình luận gốc hoặc trả lời bình luận |
| | `PATCH` | `/api/v1/discussions/:id` | Chủ bình luận | Chỉnh sửa nội dung thảo luận |
| | `DELETE`| `/api/v1/discussions/:id` | Chủ bình luận, Admin | Xóa thảo luận |
| **Thông báo** | `GET` | `/api/v1/notifications` | Đã đăng nhập | Danh sách thông báo người dùng |
| | `PATCH` | `/api/v1/notifications/:id/read` | Chủ thông báo | Đánh dấu thông báo đã đọc |
| **Nội bộ RAG**| `GET` | `/internal/rag-materials` | `X-Internal-Service-Key` | Trích xuất học liệu phục vụ M4 RAG Knowledge Base |

---

## 5. Quy Chuẩn Response Envelope & Mã Lỗi

Toàn bộ hệ thống thống nhất cấu trúc phản hồi JSON:

### Phản hồi thành công
* Dữ liệu đơn lẻ (`ok` / `successResponse`):
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```
* Dữ liệu phân trang (`paginated` / `paginatedResponse`):
  ```json
  {
    "success": true,
    "data": [ ... ],
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 42,
      "totalPages": 3
    }
  }
  ```

### Phản hồi lỗi chuẩn hóa
```json
{
  "success": false,
  "error": {
    "code": "SEQUENTIAL_ACCESS_VIOLATION",
    "message": "You must complete previous lessons before accessing this one.",
    "details": { ... }
  }
}
```

Các mã lỗi nghiệp vụ chính:
* `VALIDATION_ERROR` (422 / 400): Dữ liệu gửi lên sai schema TypeBox.
* `UNAUTHORIZED` (401): Thiếu token, token sai chữ ký, hết hạn hoặc sai internal service key.
* `FORBIDDEN` / `INSUFFICIENT_ROLE_PERMISSIONS` (403): Không đủ thẩm quyền role.
* `SEQUENTIAL_ACCESS_VIOLATION` (403): Vi phạm quy tắc học bài tuần tự.
* `RESOURCE_NOT_FOUND` (404): Không tìm thấy tài nguyên yêu cầu.
* `DUPLICATE_ENROLLMENT` / `CONFLICT` (409): Trùng lặp dữ liệu (email trùng, ghi danh lặp lại).

---

## 6. Hướng Dẫn Cấu Hình Biến Môi Trường (`.env`)

Tạo file `apps/api/.env` dựa trên file mẫu `.env.example`:

```bash
# 1. Server & Mạng
PORT=8000
HOST=0.0.0.0
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# 2. Cơ sở dữ liệu PostgreSQL
DATABASE_URL=postgresql://lurnkode_user:lurnkode_password@localhost:5433/lurnkode_db

# 3. Khóa bảo mật giao tiếp nội bộ (Dành cho M4 RAG Service)
INTERNAL_SERVICE_KEY=your_secure_internal_service_key_for_m4_rag

# 4. Cấu hình JWT RS256 (M1 Auth Service)
# Tạo cặp khóa:
#   openssl genrsa -out private.pem 2048
#   openssl rsa -in private.pem -pubout -out public.pem
# Mã hóa Base64:
#   Linux/Mac: base64 -w 0 private.pem
#   Windows PowerShell: [Convert]::ToBase64String([IO.File]::ReadAllBytes("private.pem"))
JWT_PRIVATE_KEY_BASE64=<base64_encoded_private_key_pem>
JWT_PUBLIC_KEY_BASE64=<base64_encoded_public_key_pem>
JWT_KEY_ID=m1-auth-key-v1
JWT_ISSUER=https://lurnkode.local/m1
JWT_AUDIENCE=lurnkode-api
JWT_ACCESS_TOKEN_TTL=900
JWT_REFRESH_TOKEN_TTL=604800
```

---

## 7. Các Lệnh Thực Thi (Development & Scripts)

Thực hiện trong thư mục `apps/api`:

```bash
cd apps/api

# Cài đặt thư viện phụ thuộc
bun install

# Áp dụng migration cơ sở dữ liệu (Bao gồm M1 và M2)
bun run db:migrate

# Chạy server ở chế độ phát triển (Hot reload)
bun run dev
# -> Server lắng nghe tại: http://localhost:8000
# -> Tài liệu tương tác Swagger: http://localhost:8000/docs

# Chạy toàn bộ test suites (Bao gồm cả bộ test tích hợp M1 + M2)
bun test

# Kiểm tra an toàn kiểu dữ liệu TypeScript
bun run typecheck
```

---

## 8. Hiện Thực Tích Hợp Frontend M5 (`apps/web/lurnkode-ui`)

Phân hệ Frontend M5 đã chuyển đổi hoàn toàn cơ chế từ Mock Data sang gọi trực tiếp API Backend (`apps/api`) thông qua tầng API client tại `apps/web/lurnkode-ui/lib/api/`:

### 8.1. Cấu trúc tầng giao tiếp API M5
* **`lib/api/client.ts`:** `apiClient<T>` tự động gắn JWT Bearer Token, gửi kèm cookie (`credentials: "include"`), và mở gói envelope phản hồi chuẩn `{ success, data, error }`.
* **`lib/api/auth.ts`:** Khớp nối M1 Auth Service (`login`, `register`, `me`, `refresh`, `logout`).
* **`lib/api/courses.ts`:** Khớp nối M2 Course Management (`listPublished`, `getById`, `create`, `createChapter`, `createLesson`, `createMaterial`).
* **`lib/api/enrollments.ts`:** Khớp nối M2 Enrollment & Sequential Progress (`enroll`, `getMyEnrollments`, `accessLesson`, `completeLesson`).
* **`lib/api/interactions.ts`:** Khớp nối M2 Discussions & Notifications (`listLessonDiscussions`, `createDiscussion`, `getNotifications`, `markNotificationRead`).
* **`lib/api/adapters.ts`:** Bộ chuyển đổi dữ liệu thông minh giữa Backend Drizzle schema sang giao diện Next.js UI, tính toán tiến độ mở khóa tuần tự và hỗ trợ fallback linh hoạt khi backend offline.

### 8.2. Luồng dữ liệu (Data Flow) khớp nối M1 - M2 - M5
1. **Đăng nhập & Cấp danh tính (M5 $\leftrightarrow$ M1):**
   * Người dùng đăng nhập qua M5 UI $\rightarrow$ gọi `authApi.login({ email, password })`.
   * M1 cấp Access Token (lưu `localStorage`) và Refresh Token (cookie `HttpOnly`).
   * Các request tiếp theo tự động mang `Authorization: Bearer <token>`.
2. **Catalog & Chi tiết khóa học (M5 $\leftrightarrow$ M2):**
   * `CourseCatalogPage` gọi `fetchCourses()` $\rightarrow$ gọi `coursesApi.listPublished()` và `enrollmentsApi.getMyEnrollments()`.
   * `CourseDetailPage` gọi `fetchCourseById(courseId)` $\rightarrow$ gọi `coursesApi.getById(courseId)` để nạp toàn bộ cấu trúc Chapters, Lessons.
3. **Ghi danh & Học tập tuần tự (M5 $\leftrightarrow$ M2):**
   * Nhấn "Đăng ký": M5 gọi `enrollmentsApi.enroll(courseId)` (POST `/api/v1/courses/:id/enroll`).
   * Vào học bài: M5 gọi `enrollmentsApi.accessLesson(lessonId)` (GET `/api/v1/lessons/:id/access`). M2 kiểm tra ràng buộc `requestedRank <= unlockedRank + 1`.
   * Hoàn thành bài: Nhấn "Hoàn thành", M5 gọi `enrollmentsApi.completeLesson(lessonId)` (POST `/api/v1/lessons/:id/complete`). M2 cập nhật `lastAccessedLessonId` theo nguyên tắc đơn điệu (Monotonic) và mở khóa bài tiếp theo.
4. **Biên soạn khóa học (Studio M5 $\leftrightarrow$ M2):**
   * Giảng viên tạo khóa học trong Studio: `CourseBuilderDialog` gọi `coursesApi.create()` $\rightarrow$ `createChapter()` $\rightarrow$ `createLesson()` $\rightarrow$ `createMaterial()` trực tiếp vào database M2.

