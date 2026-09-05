# LMS Domain Rules — DevVerse CO3103

## Core LMS Requirements

### RBAC
- 3 roles cố định: Student, Instructor, Admin
- Roles được lưu trong Supabase user_metadata
- Không thể tự assign role (chỉ Admin mới assign)

### Content Hierarchy
- Course → Module → Lesson (fixed 3 levels)
- Lesson types: video, slide, mixed, text
- Module order phải có order_index

### Enrollment
- Student phải enroll trước khi xem non-free lessons
- Instructor không thể enroll course của mình
- Admin không cần enroll

## Advanced Component 5.1: RAG AI Tutor

### MUST haves
- Vector DB: pgvector (đã chọn)
- Sources: course slides + video transcripts
- Citations: PHẢI trả về exact lesson/slide source
- Out-of-scope: PHẢI detect và respond safely
- Evaluation: RAGAS (Faithfulness + Answer Relevance)
- So sánh với Vanilla LLM baseline

### Ethics
- AI Tutor không được làm bài tập thay student
- Phải cite nguồn — không fabricate
- Giới hạn scope trong course content

## Advanced Component 5.4: Sandbox + Anti-cheat

### Sandbox MUST haves
- Isolated execution: Judge0 Docker containers
- CPU limit: 2 seconds
- Memory limit: 256MB
- Redis queue cho async processing
- Execution latency target: <2s

### Anti-cheat MUST haves
- Method: AST structural plagiarism detection
- Compare với String Matching baseline
- Metric: AST recall rate
- Include fail-safe error reporting
- KHÔNG dựa vào client-side controls

### Judge Ethics
- Plagiarism chỉ flag — không auto-punish
- Admin review trước khi action
- False positives phải có appeal path

## Security từ đề bài
- No command injection
- Strict CORS
- No leaked API keys
- Production-ready API quality

## Performance từ đề bài
- System Uptime & Stability
- Judge execution: <2s
- Code coverage: >=80%
