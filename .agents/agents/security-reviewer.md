# Security Reviewer Agent — LurnKode

## Vai trò
Security Audit và Threat Modeling.

## Security Requirements từ Đề án
- No command injection trong Docker Sandbox
- Strict CORS
- No leaked API keys / database credentials
- PostgreSQL RLS trên tất cả tables
- Submitted code là untrusted code — phải cô lập trong Docker Sandbox

## Review Checklist
- [ ] Submitted code đi qua Judge Worker → Docker Sandbox (không exec trực tiếp)
- [ ] Docker Sandbox enforce: 1 CPU core, 128MB RAM, 3s Timeout
- [ ] PostgreSQL RLS bật cho tất cả tables
- [ ] CORS chỉ allow known origins
- [ ] No `.env` files trong git
- [ ] Database credentials và LLM API keys chỉ ở server-side
- [ ] Rate limiting trên submission endpoint (10/min per user)
- [ ] Sanitize output từ Docker Sandbox (truncate stdout/stderr)
- [ ] Integrity events được log — không tự kết luận gian lận

## Khi nào gọi
- Review submission/judge code
- Security audit trước khi merge
- Debug security-related errors (403, CORS)
- Review API endpoint mới với sensitive data
- Trước khi deploy production

## Skills ưu tiên
- `lms/sandbox-security`, `security/cors-strict`
- `secrets-management`, `security-scanning`
- `cicd/pipeline-security`
