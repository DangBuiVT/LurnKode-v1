import { describe, it, expect } from 'bun:test';
import { app } from '../../src/index';

describe('M2 Learning Management — Semantic Constraints & API Suite', () => {
  it('Constraint 1: Should block an instructor from modifying another instructor course (403)', async () => {
    // TODO: Dùng app.handle(new Request('http://localhost/api/v1/courses/...', { method: 'PATCH', headers: { 'x-test-user-id': '...', 'x-test-user-role': 'Instructor' } }))
  });

  it('Constraint 2: Should block an instructor from enrolling in their own course (403)', async () => {
    // TODO: Kiểm tra gọi POST /api/v1/courses/:id/enroll bởi chính tác giả khóa học
  });

  it('Constraint 4 & 5: Should enforce sequential lesson access and monotonic progress', async () => {
    // TODO:
    // 1. Học viên mới enroll gọi GET /lessons/:lesson2/access -> Nhận 403 SEQUENTIAL_PREREQUISITE_FAILED
    // 2. Học viên gọi GET /lessons/:lesson1/access -> 200 OK
    // 3. Học viên gọi POST /lessons/:lesson1/complete -> 200 OK
    // 4. Học viên gọi GET /lessons/:lesson2/access -> 200 OK
  });

  it('Constraint 7 & 8: Should reject non-markdown material flagged as RAG source (400)', async () => {
    // TODO: Gửi POST /lessons/:id/materials với type='video' và isRagSource=true -> Nhận 400 Bad Request
  });

  it('Constraint 9 & 10: Should reject cross-lesson discussion replies and whitespace-only comments (400)', async () => {
    // TODO: Gửi POST /lessons/:id/discussions với textContent="   " -> Nhận 400 Bad Request
  });
});