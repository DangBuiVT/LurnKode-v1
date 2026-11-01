# Đối chiếu API `m1-Backend` và UI `feature/m5-ui`

**Ngày rà soát:** 30-10-2026  
**Nguồn:** ref `m1-Backend` (API) và `origin/feature/m5-ui` (UI). Báo cáo đọc trực tiếp hai ref, không checkout/chỉnh sửa source.  
**Phạm vi:** API đang được mount trong M1 và các luồng dữ liệu/nghiệp vụ xuất hiện trong UI M5.

## Tóm tắt

- **Chưa có tích hợp API thực tế giữa hai nhánh.** UI gọi `mockDb`/dữ liệu cố định; tìm kiếm trên toàn bộ `apps/web/lurnkode-ui` không thấy `fetch`, Axios, URL `/api/v1` hay cấu hình API base URL. Ví dụ: [catalog page](../../apps/web/lurnkode-ui/app/course/catalog/page.tsx), [learning view](../../apps/web/lurnkode-ui/app/learn/%5BcourseId%5D/%5BlessonId%5D/learning-view.tsx), [quiz card](../../apps/web/lurnkode-ui/components/learn/lesson-quiz-card.tsx).
- **Phần giao nhau về domain chỉ là identity/user**, vì M1 cung cấp auth và user profile; UI hiện không dùng các API đó.
- **Các nhánh M2/M3 có API một phần cho nhiều luồng UI, nhưng vẫn chưa được UI gọi.** M2 có course CRUD/list/detail và enrollment/lesson access/complete; M3 có authoring và learner attempt cho assessment. Phạm vi API còn thiếu/khác contract được phân tích ở phần bổ sung dưới đây.

## Ma trận đối chiếu

| Luồng UI | API M1 tương ứng | Kết quả |
|---|---|---|
| Đăng nhập/đăng ký/đăng xuất, refresh session | `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`; `PATCH /password` | API có sẵn. UI không có lớp gọi API hoặc luồng auth; đang gắn `CURRENT_USER` mock. **Chưa tích hợp.** |
| Identity/profiling người dùng | `GET /api/v1/auth/me` (identity claims); `GET/PATCH /api/v1/users/me` (hồ sơ) | Có backend nhưng chưa được UI gọi. Hình dạng dữ liệu cũng cần adapter (xem dưới). |
| Quản trị user, role, trạng thái | `GET/POST /api/v1/users`, `GET/PATCH /:id`, `PATCH /:id/role`, `PATCH /:id/status` | Backend có; UI M5 hiện không có màn quản trị tương ứng được nối API. |
| Danh mục/tìm kiếm/lọc/chi tiết course | Không có route course trong M1 | UI đang đọc course từ `mockDb`; chưa thể nối vào M1. Cần API M2. |
| Enroll course, lesson hierarchy, progress, last accessed | Không có route enrollment/progress trong M1 | UI sửa/đọc mock state. Cần API M2 với contract cho hierarchy/progress/enrollment. |
| Quản lý quiz, câu hỏi, submissions, điểm và thống kê | Không có route quiz/attempt trong M1 | UI hỗ trợ các thao tác qua `mockDb`; cần API M3/M6 (theo kiến trúc README) và contract nghiệp vụ tương ứng. |
| Health/JWKS | `/health`, `/.well-known/jwks.json`, `/api/v1/auth/jwks` | Hạ tầng/service-to-service; không tương ứng trực tiếp với màn hình UI. |

## Các điểm khớp

1. **Mô hình user cơ bản:** UI có `id`, `email`, `role` trong [mock schema](../../apps/web/lurnkode-ui/lib/db/schema.ts); API M1 có user profile, role và endpoint `/users/me`. Đây là nền tảng đúng để thay mock bằng API user.
2. **Phân trang danh sách có ý niệm tương thích:** M1 dùng query `page`, `limit` và response `data` + `meta` ([user schema](../../apps/api/src/schemas/user.schema.ts), [response helpers](../../apps/api/src/utils/response.ts)). Tuy vậy, UI catalog phân trang hoàn toàn trong trình duyệt (page size 6, 9, 12, 24), không gửi query đến server. Khi chuyển sang server-side, cần chuyển search/filter/sort và điều khiển page sang query hoặc giữ rõ ý định client-side.
3. **Role có cùng ba vai trò về nghĩa:** Admin, Instructor, Learner ở backend tương ứng admin, instructor, learner trong mock UI, nhưng khác casing nên phải chuẩn hóa ở boundary.

## Các điểm chưa khớp / cần làm rõ

### 1. UI chưa gọi bất kỳ API M1 nào — mức độ: blocker tích hợp

UI đang lấy dữ liệu từ singleton in-memory [`MockDatabase`](../../apps/web/lurnkode-ui/lib/db/mock-db.ts) và `CURRENT_USER` cố định ([mock-data.ts](../../apps/web/lurnkode-ui/lib/db/mock-data.ts)). Ví dụ catalog gọi `mockDb.enrollCourse`, trang học gọi `touchLessonAccess`/`toggleLessonCompleted`, quiz dùng `getQuizByLessonId`/`submitQuizAttempt`, studio gọi `saveQuiz`/`deleteQuiz`. Trạng thái chỉ ở bộ nhớ trình duyệt/server process giả lập, không đồng bộ qua M1 và không đại diện tài khoản đăng nhập thật.

**Tác động:** người dùng UI chưa thể đăng nhập bằng M1; enroll/progress/quiz không được lưu bằng API. Cần API client (base URL, credentials/cookie policy, bearer token strategy, xử lý envelope/lỗi) và thay từng mock adapter bằng service API.

### 2. Role và profile field không cùng contract — mức độ: cao khi nối auth/profile

UI mock định nghĩa role chữ thường (`learner | instructor | admin`) và user có trường `name`, `avatar_url` ([schema.ts](../../apps/web/lurnkode-ui/lib/db/schema.ts)); API dùng enum `Learner | Instructor | Admin` và profile là `fullName`, `avatarUrl` (xem [auth schema](../../apps/api/src/schemas/auth.schema.ts), [user schema](../../apps/api/src/schemas/user.schema.ts)). Cần mapping rõ ràng ở client/DTO; nếu ép kiểu trực tiếp, UI sẽ không đọc đúng tên/avatar và kiểm tra role có thể sai.

### 3. `GET /auth/me` không phải payload hồ sơ người dùng

Auth route trả identity gồm `userId`, `role`, `issuer`, `audience`, `tokenId`; profile đầy đủ nằm ở `GET /users/me`. UI tích hợp cần gọi đúng endpoint (hoặc backend thống nhất endpoint gộp) và xử lý hai kiểu payload khác nhau. Login/register lại trả user cùng token trong envelope thành công; cần chọn cách đồng bộ state sau login.

### 4. M1 không có endpoint cho các dữ liệu chính của UI — mức độ: blocker chức năng, phụ thuộc service sở hữu

Các màn course catalog/detail/learning dùng `Course`, `Chapter`, `Lesson`, `Material`, `Enrollment`; UI còn cập nhật tiến độ. Quiz UI đọc và ghi `Quiz`, `QuizAttempt`, question feedback và statistics. Không có route tương ứng trong `apps/api/src/routes` trên M1; routes hiện là auth, users, health và JWKS. Theo README M1, đây là đúng ranh giới trách nhiệm: course/progress thuộc M2; assessment thuộc M3/M6. Khi tích hợp cần xác định base URL và OpenAPI/version của các service đó; không thể suy ra API shape chỉ từ route M1.

### 5. Status/domain model khác nhau — mức độ: cần adapter/contract

UI `CourseStatus` hiển thị trạng thái ghi danh (`not_enrolled | in_progress | completed`), còn mock DB course có trạng thái xuất bản (`draft | published | archived`). M1 user status là `active | locked`. Đây là ba khái niệm khác nhau, không nên dùng chung một field `status` khi thiết kế API/DTO. Catalog đang lọc trạng thái ghi danh ở client; API course cần trả publication state và enrollment/progress riêng hoặc trả view model đã tổng hợp.

### 6. Khác quy ước lưu trữ ID và thời gian — mức độ: cần chuẩn hóa

UI mock có ID dạng chuỗi dễ đọc (`c-dsa`, `les-...`, `u-learn-01`) và nhiều timestamp dạng ISO string; M1 user response/schema mô tả UUID và `createdAt` kiểu Date. Khi dữ liệu M2/M3 chuyển sang API thật, cần chốt ID canonical (khuyến nghị opaque UUID/string) và serialize mọi timestamp JSON thành ISO-8601. Tránh logic tiền tố `c-` hiện có trong UI trở thành contract backend.

### 7. Pagination/search chưa có cùng cách thực thi

M1 giới hạn `limit` tối đa 100, mặc định 20. UI course catalog giữ toàn bộ danh sách rồi lọc/sort/phân trang ở client, với kích thước trang 6–24. Đây không phải lỗi nếu catalog cố ý tải tất cả, nhưng sẽ không tương đương server-side khi dữ liệu tăng. Nếu dùng phân trang M1 cho user list, UI cần đọc `meta.totalPages`/`totalItems`; với catalog cần contract riêng từ M2.

## Đề xuất thứ tự tích hợp

1. Chốt service owner và API contract cho course/catalog/hierarchy/enrollment/progress (M2) và quiz/attempt/gradebook (M3/M6); tài liệu M1 hiện không định nghĩa các schema đó.
2. Tạo client layer trong UI: base URL theo service, chuẩn hóa response `{ success, data }` và paginated `meta`, lỗi, timeout, auth header/cookie theo CORS credential policy của backend.
3. Nối `POST /auth/login` và `/register`, giữ access token theo chính sách bảo mật đã thống nhất; gọi refresh/logout đúng cơ chế cookie/refresh token, sau đó hydrate user từ profile endpoint. Chưa nên dựa vào mock `CURRENT_USER`.
4. Thêm adapter DTO cho `fullName/name`, `avatarUrl/avatar_url`, role casing và tách các trạng thái publication/enrollment/progress.
5. Thay dần `mockDb` theo luồng: user/auth → course browse/detail/enroll → progress → quiz CRUD/submit/results. Giữ mock implementation chỉ cho demo/dev bằng provider rõ ràng.

## Giới hạn rà soát

Đây là đối chiếu tĩnh hai ref branch, không chạy ứng dụng hay gọi API. Không thể kết luận payload thực tế ngoài những route/schema/service đang có trong M1; cũng chưa có source API M2/M3 trong phạm vi nhánh được yêu cầu. README M1 mô tả một số mục là API dự kiến, trong khi implementation routes hiện đã tồn tại; báo cáo phân loại endpoint theo code route hiện hành và dùng README để xác định ranh giới module.

## Bổ sung: đối chiếu với `feature/m2-course-management` và `feature/m3-assessment`

**Refs đã kiểm tra:** `origin/feature/m2-course-management`, `origin/feature/m3-assessment`, `origin/feature/m5-ui`. M2 API đặt trong `apps/api`; M3 là service riêng `apps/assessment-service`, không phải `apps/api`.

### M2 — Course, curriculum, enrollment và lesson progress

| Luồng UI M5 | Endpoint M2 có trong branch | Độ khớp |
|---|---|---|
| Catalog: liệt kê published courses | `GET /api/v1/courses?page&limit&search` | **Khớp một phần.** Có published list, pagination và search theo title; UI còn lọc category/instructor/status ghi danh, sort theo title/newest/progress. API list không cung cấp các trường/tùy chọn lọc đó. UI cần server-filter hoặc chấp nhận chỉ các filter có dữ liệu đủ. |
| Course detail/chapter/lesson | `GET /api/v1/courses/:id` | **Khớp một phần.** Detail trả course cùng chapters/lessons; UI cần cả materials, instructor display, enrollment và progress/lesson states. Cần xác nhận detail hiện trả materials hay chỉ lesson; contract route chưa thể coi là tương đương toàn bộ view model UI. |
| Instructor tạo/sửa/xóa course và nội dung | `POST/PATCH/DELETE /courses`, `POST /courses/:id/chapters`, `PATCH/DELETE /chapters/:id`, tương tự lessons/materials | **CRUD nền tảng có.** UI M5 hiện chủ yếu hiển thị studio courses và quiz manager, không có client gọi các route này. M2 create course chỉ nhận title/description; UI mock còn status/category/thumbnail. Material M2 hỗ trợ video/markdown/slide, UI schema có thêm `code`, nên loại code chưa khớp. |
| Enroll | `POST /api/v1/courses/:id/enroll`; `GET /api/v1/my/enrollments` | **Khớp một phần.** Tương đương thao tác enroll và xem enrollment; UI hiện gọi `mockDb.enrollCourse`. Response không được thiết kế thành UI course-card status/progress trực tiếp. |
| Load lesson/materials + kiểm tra truy cập tuần tự | `GET /api/v1/lessons/:id/access` | **Khớp mục tiêu truy cập.** UI tải hierarchy/materials từ mock. Cần chuyển UI sang endpoint này hoặc course detail; hợp đồng response vật liệu cần map sang component UI. |
| Đánh dấu lesson hoàn tất / tiến độ | `POST /api/v1/lessons/:id/complete` | **Chỉ khớp một chiều/semantics khác.** UI có toggle hoàn thành/bỏ hoàn thành và lưu `completed_lesson_ids`; M2 chỉ cập nhật `lastAccessedLessonId` theo tiến trình monotonic, không có thao tác bỏ hoàn thành hay danh sách bài đã hoàn thành. Vì vậy chưa thể dựng chính xác progress %, trạng thái từng lesson, mở khóa các lesson đã hoàn tất trước đó chỉ từ contract này. |
| Discussion, notification | Chưa có route thực thi; `interaction.routes.ts` chỉ ghi TODO cho sáu endpoint | **Chưa khớp/endpoint chưa được cài.** UI M5 hiện không có luồng gọi các nghiệp vụ này. |

Các điểm contract M2 đáng chú ý:

- ID ở schema M2 là UUID, hợp với yêu cầu canonical ID hơn các mock ID `c-dsa`/`les-...`; UI cần bỏ giả định tiền tố `c-` và chuyển sang ID thật.
- M2 role middleware dùng `Admin`, `Instructor`, `Learner`; khớp casing M1, nhưng mock UI dùng chữ thường.
- Course status M2 hiện chỉ `draft | published`; UI mock còn `archived`. Cần thống nhất nếu muốn hiển thị archive trong studio.
- M2 response helper dùng envelope `ok(...)`/`paginated(...)`; cần xem chính xác shape helper và viết chung adapter, không mặc định giống M1 `{success,data}` nếu chưa xác nhận.
- `GET /courses/:id` route không thể đại diện trạng thái enrollment của learner nếu không gọi riêng `/my/enrollments`; UI course card đang gộp publication, enrollment và progress thành nhiều trường khác nhau.

### M3 — Assessment/quiz và learner attempts

M3 tồn tại như service riêng. README liệt kê routes không có `/api/v1` prefix (`/instructor/...`, `/learner/...`); bootstrap cũng mount route ở root. Cần xác nhận gateway có rewrite/prefix nào trước khi UI gọi, tránh tự ghép `/api/v1` theo convention M1/M2.

| Luồng UI M5 | Endpoint M3 có trong branch | Độ khớp |
|---|---|---|
| Tạo quiz/assessment và thêm câu hỏi | `POST /instructor/assessments`; `POST /instructor/assessments/:id/items`; `POST /instructor/assessments/:id/publish` | **Khớp một phần.** UI builder tạo quiz với câu hỏi trắc nghiệm; M3 authoring tạo assessment draft, thêm MCQ hoặc programming item, publish. Cần nhiều request thay vì một lần `saveQuiz`, và map quiz → assessment/items. |
| Chọn assessment để chỉnh sửa, danh sách theo course | README nói create; service có `listAssessmentsByCourse`, nhưng route instructor chỉ expose `GET /:id`, không có route list-by-course | **Thiếu route quan trọng.** Studio UI cần liệt kê toàn bộ quiz theo course và sửa quiz hiện có. M3 route chưa expose list; cũng không có `PATCH/DELETE assessment` hoặc chỉnh sửa/xóa item. |
| Đọc quiz để learner làm | `POST /learner/assessments/:id/attempts` trả attempt và learner-safe items | **Khớp một phần.** Có khởi tạo attempt và trả item; UI hiện cần tải quiz/attempt history trước khi vào màn. M3 không có route learner đọc assessment riêng hoặc lấy lịch sử/latest attempts. |
| Nộp đáp án MCQ và xem điểm | `POST /learner/attempts/:attemptId/answers`, rồi `POST /learner/attempts/:attemptId/finish` | **Khớp quy trình ở mức khái niệm, contract khác UI.** UI mock submit toàn bộ `Record<questionId, optionIds>` một lần và nhận feedback tất cả câu; M3 ghi từng item rồi finish. Cần adapter nhiều request/state attempt. |
| Bài lập trình | `POST /learner/attempts/:attemptId/code-submissions` (202, chấm async qua M6) | **API có thêm năng lực so với UI.** UI M5 quiz hiện chỉ MCQ; đây là phần backend chưa có màn tương ứng. |
| Thống kê, danh sách submissions của giảng viên | Không thấy route instructor cho attempts/statistics/submissions | **Thiếu API cho UI studio.** UI mở thống kê, danh sách bài nộp và chi tiết feedback qua `getQuizStatistics`/`getQuizAttempts`; cần endpoint gradebook/results và quyền instructor. |
| Xóa quiz | UI có `mockDb.deleteQuiz` | **Không có endpoint M3 tương ứng.** |

Các mismatch M3 về schema/nghiệp vụ:

1. UI quiz có `passing_score_percentage`, `max_attempts` (cho phép `0 = unlimited`), `time_limit_minutes`; M3 dùng `maxAttempts` là số nguyên dương mặc định 3, `timeLimitSec`, và hiện không có pass threshold configurable. `finishAttempt` đang trả `passed` theo ngưỡng cứng 50%. Cần quyết định ngưỡng và map đơn vị/giới hạn; không thể dùng nguyên giá trị UI.
2. UI MCQ dùng `single_choice | multiple_choice`, câu hỏi `explanation`, và `options[].is_correct`; M3 dùng assessment item type `mcq`, `mcqType: single | multiple`, option text và answer key `correctOptionIds`, không có explanation field trong contract đang đọc. Đây là mapping khả thi cho lựa chọn/đáp án nhưng thiếu giải thích nếu UI cần review feedback.
3. UI xóa quiz thì mock xóa cả attempts liên quan; M3 không có delete route và ownership/policy xóa chưa được contract hóa.
4. M3 learner response mapper cố ý loại `correctOptionIds`, solutions và hidden test cases khỏi payload learner. UI hiện preview learner và hiển thị correct answers/explanations trong feedback mock; cần giữ nguyên nguyên tắc không lộ đáp án trước khi submit và định nghĩa response review sau submit an toàn.
5. M3 route comments nói gateway xác thực JWT và forward `X-User-Id`/`X-User-Role`, nhưng learner route hiện fallback về `learner_dev_user` khi thiếu `X-User-Id`; instructor route chưa thấy kiểm tra role/identity trong handler. Trước tích hợp thật, cần gateway đảm bảo chặn request trực tiếp/thiếu identity và M3 enforce identity + role trong service boundary. Đây là vấn đề contract/bảo vệ endpoint được thấy trong source, không chỉ khác biệt UI.
6. M3 attempt/service dùng course enrollment RPC sang M2 và phát event hoàn tất. Cần xác nhận contract RPC với M2; M2 hiện có route `GET /my/enrollments`, nhưng chưa thấy endpoint internal `checkEnrollment(courseId,userId)` công khai theo contract mà README M3 mô tả. Có thể endpoint internal tồn tại qua client/service config; cần xác minh trước khi triển khai tích hợp end-to-end.

### Kết luận cập nhật

- **M2 có thể đáp ứng phần lõi catalog/detail/enroll/access/complete và CRUD curriculum**, nên nhận định cũ “chưa có API course” chỉ đúng với M1; với branch M2 hiện tại, API đã hiện diện nhưng UI chưa tích hợp và progress semantics còn thiếu so với mock.
- **M3 có nền tảng authoring, MCQ/programming, attempt và chấm điểm**, nhưng thiếu endpoint list/edit/delete/gradebook cần cho UI studio, khác flow submit của learner, và có khác biệt đáng kể về attempt limit/pass threshold/response feedback.
- **Chưa có đường tích hợp chạy xuyên suốt:** UI M5 không gọi service M1/M2/M3; M3 route prefix khác M1/M2 và phải đi qua gateway/auth header contract đã thống nhất.

