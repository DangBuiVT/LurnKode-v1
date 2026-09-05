# Security Rules — DevVerse LMS

## BẮT BUỘC (từ đề bài)

### 1. No Command Injection
- User code CHỈ được chạy qua Judge0 API
- TUYỆT ĐỐI KHÔNG: exec(), eval(), os.system(user_code)
- Validate code size (max 64KB) trước khi gửi Judge0

### 2. CORS Strict
- Không dùng wildcard (*) trong production
- ALLOWED_ORIGINS từ environment variable
- Credentials: true chỉ khi cần thiết

### 3. No Leaked API Keys
- Tất cả secrets trong environment variables
- .env KHÔNG commit vào git
- NEXT_PUBLIC_ prefix CHỈ cho keys được phép expose
- SUPABASE_SERVICE_ROLE_KEY: server-side only

### 4. Supabase RLS
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
- Truncate Judge0 stdout (max 4KB), stderr (max 1KB)
- Không expose internal stack traces
