# LMS Domain Rules — LurnKode CO3103

## Core LMS Requirements

### RBAC
- 3 roles cố định: **Learner** (Student), **Instructor**, **Admin**
- Roles được lưu trong bảng `users` của PostgreSQL (quản lý qua Drizzle ORM)
- Không thể tự assign role (chỉ Admin mới assign)
- Middleware kiểm tra role trước khi xử lý request

### Content Hierarchy
- **Course → Chapter → Lesson → Material** (4 cấp)
- Material types: video, markdown/text, slide
- Chapter và Lesson phải có `order_index`
- Sequential learning: phải hoàn thành Lesson trước mới mở Lesson tiếp theo

### Enrollment
- Learner phải enroll trước khi xem non-free lessons
- Instructor không thể enroll course của mình
- Admin không cần enroll

## AI Tutor — RAG (Course-Grounded)

### MUST haves
- Vector DB: **pgvector** (trong PostgreSQL, Drizzle schema)
- Sources: CHỈ **published** course materials được đưa vào knowledge base
- Citations: PHẢI trả về exact Chapter/Lesson/Material source
- Out-of-scope: PHẢI detect và respond an toàn (không hallucinate)
- Evaluation metrics: Recall@K, Precision@K, Answer Relevance, Grounding, Citation Correctness, Out-of-scope Rejection Accuracy, User Feedback

### Ethics
- AI Tutor không được làm bài tập thay learner
- Phải cite nguồn — không fabricate
- Giới hạn scope trong published course content

## Automated Code Assessment — Judge Worker & Docker Sandbox

### Sandbox MUST haves
- Isolated execution: **Docker Sandbox** (container cô lập)
- **CPU limit: 1 CPU core**
- **Memory limit: 128MB RAM**
- **Execution timeout: 3 seconds**
- **Submission Queue: Redis** (async processing)
- Kết quả: **AC** (Accepted), **WA** (Wrong Answer), **TLE** (Time Limit Exceeded), **RTE** (Runtime Error)

### Architecture
```
Code Submission
      ↓ Validate (size, language whitelist)
Redis Submission Queue
      ↓ Judge Worker picks up job
Docker Sandbox (resource-limited)
      ↓ Run against Hidden Tests
Test Result → Store → Notify Frontend
```

### Integrity Monitoring
- Suspicious activity → **Integrity Event** (logged for Instructor review)
- **KHÔNG tự động kết luận gian lận** — Instructor phải review evidence
- Integrity event chỉ là cảnh báo, không tự áp dụng hình phạt

## Security từ Đề án
- No command injection — code học viên không được chạy trong API process
- Strict CORS
- No leaked API keys / database credentials
- Production-ready API quality

## Performance từ Đề án
- Judge execution: < 3s (Docker Sandbox timeout)
- Code coverage: >= 80%
