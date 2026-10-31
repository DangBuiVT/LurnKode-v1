# M1 — Auth Service

> Backend xác thực và quản lý danh tính người dùng của LurnKode. M1 cấp danh tính/role để các service khác có thể xác thực request; mỗi service vẫn tự kiểm tra quyền truy cập vào dữ liệu do mình sở hữu.

**Trạng thái:** đang chuẩn bị cấu trúc; các file trong `src/` hiện là placeholder, chưa có implementation.

## Mục tiêu

M1 chịu trách nhiệm cho:

- Quản lý tài khoản, thông tin đăng nhập và trạng thái tài khoản.
- Đăng nhập, đăng xuất và vòng đời token theo cơ chế xác thực được nhóm thống nhất.
- Cung cấp danh tính và role toàn cục cho người dùng hiện tại.
- Quản lý role toàn cục như `Admin`, `Instructor`, `Learner`.
- Xác thực request đến M1 và cung cấp thông tin định danh cho các service tiêu thụ JWT.

M1 không quyết định người dùng có quyền trên một tài nguyên nghiệp vụ cụ thể hay không. Ví dụ, quyền giảng viên sửa course thuộc M2 và phải được kiểm tra tại M2.

## Ranh giới module

| Module | Sở hữu |
|---|---|
| **M1 — Auth Service** | Users, credentials, global roles, login/logout, token và hồ sơ danh tính |
| **M2 — Learning Management** | Courses, chapters, lessons, materials, enrollments, progress, discussions, notifications |
| **M3 / M6** | Assessment, grading và thực thi code |
| **M4** | AI Tutor và RAG |

Nguyên tắc tích hợp:

- Mỗi service sở hữu database/schema riêng; service khác không đọc trực tiếp database M1.
- Service tiêu thụ token phải xác minh chữ ký và các claim cần thiết theo cơ chế đã thống nhất, rồi dùng user ID/role làm remote identity.
- M1 không tạo bảng, route hay nghiệp vụ cho course, lesson, enrollment, assignment, submission hoặc grade.
- Global role không thay thế kiểm tra quyền trên tài nguyên. M2 vẫn phải tự kiểm tra enrollment và quyền sở hữu course.

## API dự kiến

Base path: `/api/v1`. Danh sách dưới đây là hợp đồng dự kiến, chưa khẳng định endpoint đã hoạt động.

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/health` | Health check ngoại lệ, không thuộc `/api/v1`, không yêu cầu đăng nhập |
| `POST` | `/api/v1/auth/register` | Đăng ký public, chỉ tạo tài khoản role `Learner` nếu nhóm chọn tự đăng ký |
| `POST` | `/api/v1/auth/login` | Xác thực thông tin đăng nhập và cấp token |
| `POST` | `/api/v1/auth/logout` | Thu hồi refresh session hiện tại; access JWT còn hiệu lực đến khi hết hạn |
| `GET` | `/api/v1/auth/me` | Lấy identity đã xác thực: `userId`, role và claim cần cho caller |
| `POST` | `/api/v1/auth/refresh` | Xoay refresh token và cấp access token mới |
| `PATCH` | `/api/v1/auth/password` | Đổi mật khẩu sau khi xác minh mật khẩu hiện tại |
| `GET` | `/api/v1/users/me` | Lấy hồ sơ cá nhân: tên, email, avatar và trường được phép công khai |
| `PATCH` | `/api/v1/users/me` | Cập nhật các trường hồ sơ được phép |
| `GET` | `/api/v1/users` | Tìm/list tài khoản theo quyền quản trị |
| `POST` | `/api/v1/users` | Admin tạo tài khoản nếu không bật đăng ký public |
| `GET` | `/api/v1/users/:id` | Xem tài khoản theo quyền |
| `PATCH` | `/api/v1/users/:id` | Cập nhật các trường hồ sơ được phép; không đổi role/status |
| `PATCH` | `/api/v1/users/:id/role` | Admin đổi global role |
| `PATCH` | `/api/v1/users/:id/status` | Khóa hoặc mở tài khoản theo quyền quản trị |

Quyết định đề xuất cho MVP: access JWT RS256 TTL 15 phút; refresh token ngẫu nhiên TTL 7 ngày, chỉ lưu hash, rotation mỗi lần refresh và phát hiện reuse để thu hồi token family. Logout thu hồi refresh session; access JWT không bị vô hiệu hóa ngay nếu chưa có denylist. Khi khóa tài khoản hoặc đổi mật khẩu, thu hồi các refresh session đang hoạt động. Cần nhóm xác nhận chính sách đăng ký Learner và phương thức lưu refresh token cho frontend trước khi chốt OpenAPI.

## Quy ước API

- Request/response dùng JSON; private endpoint yêu cầu `Authorization: Bearer <token>`.
- Dùng danh từ số nhiều cho tài nguyên, `PATCH` cho cập nhật một phần.
- Endpoint danh sách dùng `page` và `limit`; backend đặt giới hạn `limit` tối đa.
- Thành công và lỗi dùng envelope nhất quán. Không trả password hash, secret hoặc token trong log.
- Lỗi validation, chưa xác thực, không đủ quyền, không tìm thấy và xung đột phải có mã lỗi ổn định.

Response thành công đề xuất:

```json
{
  "success": true,
  "data": {}
}
```

Response danh sách đề xuất (giữ cùng success envelope):

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

Endpoint trả `204 No Content` không gửi response body. Mọi lỗi (`401`, `403`, `404`, `409`, `422`...) cần `error.code` ổn định.

Response lỗi đề xuất:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": []
  }
}
```

## JWT và xác thực liên service

Access token dùng JWT ký RS256, TTL đề xuất 15 phút. M1 công bố public key qua JWKS; private key chỉ tồn tại trong môi trường M1. Service tiêu thụ phải xác minh chữ ký, `iss`, `aud`, `exp` và các claim bắt buộc trước khi tin identity.

| Claim | Quy tắc |
|---|---|
| `sub` | UUID của user |
| `role` | `Admin`, `Instructor` hoặc `Learner` |
| `iss` | Issuer cố định của M1 |
| `aud` | Audience được các service thống nhất |
| `iat` | Thời điểm phát hành |
| `exp` | Thời điểm hết hạn |
| `jti` | ID duy nhất của token; khuyến nghị dùng để truy vết/denylist nếu cần |

Role thay đổi không sửa được JWT đã phát hành; trong MVP token cũ có thể giữ role cũ tối đa 15 phút. Khi khóa tài khoản/đổi mật khẩu, thu hồi refresh session; access token đã phát hành vẫn sống đến `exp` nếu chưa có denylist hoặc cơ chế tương đương.

Refresh token đề xuất là chuỗi ngẫu nhiên đủ mạnh, TTL 7 ngày, chỉ lưu hash trong DB và rotation mỗi lần sử dụng. Nếu token đã rotate bị dùng lại, thu hồi toàn bộ session/token family tương ứng. Logout thu hồi refresh session hiện tại; không tuyên bố access JWT bị revoke tức thì.

Frontend cần chốt cách lưu refresh token. Với web, ưu tiên cookie `HttpOnly`, `Secure`, `SameSite` phù hợp và phải có biện pháp CSRF; nếu dùng Authorization header, tránh lưu token dài hạn ở nơi JavaScript có thể đọc.

## Kiến trúc và cấu trúc thư mục

Luồng request dự kiến:

```text
Client / Service → Elysia routes → Authentication → Authorization
                 → Validation → Service → Repository → M1 database
                 → Standard response / error handling
```

```text
src/
├── app.ts                 # Lắp ráp Elysia app và plugin
├── index.ts               # Điểm khởi chạy service
├── routes/                # health, auth, users
├── plugins/               # auth, database, error handler
├── middlewares/           # kiểm tra quyền thuộc phạm vi M1
├── schemas/               # validation request/response
├── services/              # nghiệp vụ auth và user
├── repositories/          # truy cập dữ liệu M1
├── db/schema/             # chỉ schema do M1 sở hữu
├── types/                 # kiểu dùng chung trong M1
└── utils/                  # response, pagination, logging

tests/
├── unit/
└── integration/
```

Route chỉ nhận/validate request và điều phối service; không đặt truy vấn database hoặc nghiệp vụ phức tạp trong route.

## Công nghệ

Theo định hướng chung của repo, backend dùng **Bun + ElysiaJS + TypeScript**, REST API, PostgreSQL và Drizzle ORM. M1 là service riêng; không cần Redis, pgvector, AI provider hay Docker Sandbox chỉ để thực hiện chức năng Auth.

Dependency, script chạy và biến môi trường cụ thể sẽ được khai báo khi khởi tạo app. Không tạo giá trị secret thật trong README hoặc commit file `.env`.

## Bảo mật tối thiểu

- Hash mật khẩu bằng thuật toán phù hợp; không lưu mật khẩu dạng rõ.
- Không ghi mật khẩu, access token, refresh token hoặc secret vào log.
- Validate dữ liệu đầu vào bằng schema và chỉ cho phép cập nhật trường được hỗ trợ.
- Dùng HTTPS ở môi trường triển khai và cấu hình CORS theo allowlist.
- Giới hạn/rate-limit endpoint đăng nhập; tránh tiết lộ tài khoản có tồn tại qua thông báo lỗi.
- Access JWT ký RS256, TTL đề xuất 15 phút; service tiêu thụ phải kiểm tra chữ ký, `iss`, `aud`, `exp` và claim cần thiết.
- Refresh token TTL đề xuất 7 ngày, chỉ lưu hash, rotate khi refresh; logout thu hồi refresh session chứ không giả định access JWT bị revoke ngay.
- Cấu hình JWKS/key rotation; giới hạn quyền truy cập private signing key.
- Mọi service phải xác minh token đáng tin cậy; không tin user ID/role do client tự gửi trong body/header tùy ý.
- Trả lỗi an toàn cho client, không để lộ stack trace hoặc thông tin nội bộ.

## Kế hoạch triển khai

1. Xác nhận đăng ký Learner public hay chỉ Admin tạo tài khoản; chốt refresh-token transport/cookie và CSRF policy. Token đề xuất và claim contract đã ghi ở trên.
2. Khởi tạo Bun/Elysia app, cấu hình môi trường, logging, lỗi chuẩn và `/health`.
3. Thiết kế schema M1 cho users, credentials, roles và refresh sessions (lưu hash, rotation/reuse state).
4. Xây dựng auth middleware, login, `/auth/me`, logout/refresh theo quyết định đã chốt.
5. Xây dựng hồ sơ và quản trị users/roles.
6. Viết API contract và kiểm tra các luồng thành công, lỗi xác thực, lỗi phân quyền.
7. Cung cấp hướng dẫn tích hợp JWT cho M2 và các service liên quan.

## Kiểm tra và tiêu chí hoàn thành

- Health endpoint hoạt động và không cần token.
- Private endpoints từ chối token thiếu, sai chữ ký, hết hạn hoặc không hợp lệ.
- Người dùng chỉ xem/sửa hồ sơ của mình; thao tác quản trị bị giới hạn theo role.
- Password không được trả về API response hoặc ghi vào log.
- Token chứa định danh/role cần thiết cho service tiêu thụ và có quy tắc xác minh rõ ràng.
- Tài liệu API phản ánh đúng implementation; không mô tả M2/M3 như chức năng của M1.

## Tài liệu liên quan

- [Kiến trúc và tech stack](../../docs/guides/tech-stack.md)
- [Hướng dẫn bắt đầu repo](../../docs/guides/getting-started.md)
- [Cấu hình môi trường](../../docs/guides/environment-setup.md)
- [Tổng quan LurnKode](../../README.md)



## Setup môi trường

Xem hướng dẫn [thiết lập môi trường M1](../../docs/api/m1/environment-setup.md). Skeleton hiện chưa có manifest, config loader hoặc migration nên các bước chạy API sẽ hoạt động sau khi bootstrap hoàn tất.


## M2 Course Management

The M2 learning module is mounted in the same Elysia application as M1. It provides course, enrollment, interaction, and internal RAG-material routes, with API documentation at `/docs`.

M2 uses the canonical M1 `users` table and validates the RS256 bearer token through the M1 auth plugin. Instructor and learner records are membership data linked to those users. Configure `INTERNAL_SERVICE_KEY` for trusted internal service calls; leave it unset only when those routes are not used.

After configuring `DATABASE_URL` and the M1 signing keys, install dependencies with `bun install`, apply migrations with `bun run db:migrate`, and start the API with `bun run dev` from `apps/api`.
