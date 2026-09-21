# Security Rules — LurnKode LMS

## BẮT BUỘC

### 1. No Command Injection / Untrusted Code Execution
- Submitted code là **untrusted code** — KHÔNG được chạy trực tiếp trong API process
- TUYỆT ĐỐI KHÔNG: `exec()`, `eval()`, `os.system(user_code)` trong API
- Submitted code CHỈ được chạy qua **Judge Worker** trong **Docker Sandbox**
- Docker Sandbox enforce resource limits: **1 CPU core, 128MB RAM, 3s Timeout**
- Validate code size (max 64KB) trước khi enqueue

### 2. CORS Strict
- Không dùng wildcard (`*`) trong production
- `ALLOWED_ORIGINS` từ environment variable
- Credentials: true chỉ khi cần thiết

### 3. No Leaked Secrets
- Tất cả secrets trong environment variables
- `.env` KHÔNG commit vào git
- `NEXT_PUBLIC_` prefix CHỈ cho keys được phép expose ra browser
- Database credentials, LLM API keys: server-side only

### 4. PostgreSQL RLS
- BẮT BUỘC bật RLS trên tất cả tables
- Mỗi table phải có policy cho từng role cần thiết

## Bổ sung

### Rate Limiting
- Submission endpoint: 10/min per user
- AI Tutor: 20/min per user
- Auth endpoints: 5/min per IP

### Input Validation
- Validate tất cả user input server-side
- Sanitize HTML content (rich text)
- UUID format validation cho ID params

### Output Sanitization
- Truncate Docker Sandbox stdout (max 4KB), stderr (max 1KB)
- Không expose internal stack traces
- Integrity events được log cho Instructor review — không tự kết luận gian lận
