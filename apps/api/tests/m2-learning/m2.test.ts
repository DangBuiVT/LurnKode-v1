import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { app } from '../../src/index';
import { db, users, courses, notifications } from '../../src/db';
import { createTokenServiceFromEnvironment, type TokenService } from '../../src/services/token.service';
import { UserRole } from '../../src/types';
import { env } from '../../src/config/env';

describe('M1 + M2 Full Integration — Curriculum, Sequential Learning, Interactions & RAG', () => {
  let tokenService: TokenService;

  const adminId = randomUUID();
  const instructor1Id = randomUUID();
  const instructor2Id = randomUUID();
  const learnerId = randomUUID();

  let adminHeaders: Record<string, string>;
  let inst1Headers: Record<string, string>;
  let inst2Headers: Record<string, string>;
  let learnerHeaders: Record<string, string>;

  let courseId: string;
  let chapterId: string;
  let lesson1Id: string;
  let lesson2Id: string;
  let material1Id: string;
  let rootDiscussionId: string;

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, learnerId));
    await db.delete(courses).where(inArray(courses.instructorId, [instructor1Id, instructor2Id]));
    await db.delete(users).where(inArray(users.id, [adminId, instructor1Id, instructor2Id, learnerId]));
  });
  beforeAll(async () => {
    tokenService = await createTokenServiceFromEnvironment();
    const passwordHash = await Bun.password.hash('Password123!', { algorithm: 'argon2id' });

    // 1. Tạo tài khoản thật trong bảng users của M1
    await db.insert(users).values([
      {
        id: adminId,
        email: `admin.${adminId}@lurnkode.test`,
        passwordHash,
        fullName: 'System Admin',
        role: 'Admin',
        status: 'active',
      },
      {
        id: instructor1Id,
        email: `inst1.${instructor1Id}@lurnkode.test`,
        passwordHash,
        fullName: 'Instructor One',
        role: 'Instructor',
        status: 'active',
      },
      {
        id: instructor2Id,
        email: `inst2.${instructor2Id}@lurnkode.test`,
        passwordHash,
        fullName: 'Instructor Two',
        role: 'Instructor',
        status: 'active',
      },
      {
        id: learnerId,
        email: `learner.${learnerId}@lurnkode.test`,
        passwordHash,
        fullName: 'Learner Student',
        role: 'Learner',
        status: 'active',
      },
    ]);

    // 2. Cấp phát JWT RS256 thật từ M1 TokenService
    const [adminToken, inst1Token, inst2Token, learnerToken] = await Promise.all([
      tokenService.issueAccessToken({ id: adminId, role: UserRole.Admin }),
      tokenService.issueAccessToken({ id: instructor1Id, role: UserRole.Instructor }),
      tokenService.issueAccessToken({ id: instructor2Id, role: UserRole.Instructor }),
      tokenService.issueAccessToken({ id: learnerId, role: UserRole.Learner }),
    ]);

    adminHeaders = { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` };
    inst1Headers = { 'content-type': 'application/json', authorization: `Bearer ${inst1Token}` };
    inst2Headers = { 'content-type': 'application/json', authorization: `Bearer ${inst2Token}` };
    learnerHeaders = { 'content-type': 'application/json', authorization: `Bearer ${learnerToken}` };
  });

  it('Leave course: learner can leave, then re-enroll', async () => {
    const send = (method: string, path: string, headers: Record<string, string>, body?: unknown) =>
      app.handle(new Request(`http://localhost${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      }));

    const course = ((await (await send('POST', '/api/v1/courses', inst1Headers, { title: 'Leave test' })).json()) as any).data;
    await send('PATCH', `/api/v1/courses/${course.id}`, inst1Headers, { status: 'published' });

    expect((await send('POST', `/api/v1/courses/${course.id}/enroll`, learnerHeaders)).status).toBe(201);
    expect((await send('DELETE', `/api/v1/courses/${course.id}/enroll`, learnerHeaders)).status).toBe(204);
    const again = await send('DELETE', `/api/v1/courses/${course.id}/enroll`, learnerHeaders);
    expect(again.status).toBe(403);
    expect(((await again.json()) as any).error.code).toBe('NOT_ENROLLED');
    expect((await send('POST', `/api/v1/courses/${course.id}/enroll`, learnerHeaders)).status).toBe(201);
    expect((await send('DELETE', `/api/v1/courses/${course.id}/enroll`, inst1Headers)).status).toBe(403);
  });

  it('Edge: delete last updated lesson of learner', async () => {
    const send = (method: string, path: string, headers: Record<string, string>, body?: unknown) =>
      app.handle(new Request(`http://localhost${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      }));

    const course = ((await (await send('POST', '/api/v1/courses', inst1Headers, { title: 'Edge delete' })).json()) as any).data;
    await send('PATCH', `/api/v1/courses/${course.id}`, inst1Headers, { status: 'published' });
    const ch = ((await (await send('POST', `/api/v1/courses/${course.id}/chapters`, inst1Headers, { title: 'C' })).json()) as any).data;
    const l1 = ((await (await send('POST', `/api/v1/chapters/${ch.id}/lessons`, inst1Headers, { title: 'L1' })).json()) as any).data;
    await send('POST', `/api/v1/courses/${course.id}/enroll`, learnerHeaders);
    await send('POST', `/api/v1/lessons/${l1.id}/complete`, learnerHeaders);

    const del = await send('DELETE', `/api/v1/lessons/${l1.id}`, inst1Headers);
    expect(del.status).toBe(409);
    expect(((await del.json()) as any).error.code).toBe('LESSON_HAS_LEARNER_PROGRESS');
  });

  it('Stage 2 & Constraint 1, 6, 7, 8: Should manage curriculum hierarchy and enforce ownership & material rules', async () => {
    // 0. Kiểm tra status endpoint của M2
    const statusRes = await app.handle(new Request('http://localhost/api/v1/m2/status'));
    expect(statusRes.status).toBe(200);

    // 1. Instructor 1 tạo khóa học (201)
    const createCourseRes = await app.handle(
      new Request('http://localhost/api/v1/courses', {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({ title: 'Cloud Programming CO3103', description: 'M1+M2 Integration' }),
      })
    );
    expect(createCourseRes.status).toBe(201);
    courseId = ((await createCourseRes.json()) as any).data.id;

    // 2. Constraint 1: Instructor 2 cố tình sửa khóa học của Instructor 1 -> 403 NOT_COURSE_OWNER
    const hijackRes = await app.handle(
      new Request(`http://localhost/api/v1/courses/${courseId}`, {
        method: 'PATCH',
        headers: inst2Headers,
        body: JSON.stringify({ title: 'Hijacked Course' }),
      })
    );
    expect(hijackRes.status).toBe(403);
    expect(((await hijackRes.json()) as any).error.code).toBe('NOT_COURSE_OWNER');

    // 3. Instructor 1 publish khóa học (200) và kiểm tra danh sách + chi tiết khóa học
    const pubRes = await app.handle(
      new Request(`http://localhost/api/v1/courses/${courseId}`, {
        method: 'PATCH',
        headers: inst1Headers,
        body: JSON.stringify({ status: 'published' }),
      })
    );
    expect(pubRes.status).toBe(200);

    const listRes = await app.handle(
      new Request('http://localhost/api/v1/courses?page=1&limit=10&search=CO3103')
    );
    expect(listRes.status).toBe(200);

    const detailRes = await app.handle(new Request(`http://localhost/api/v1/courses/${courseId}`));
    expect(detailRes.status).toBe(200);

    // 4. Tạo Chapter 1 (auto orderIndex = 1) và cập nhật tên Chapter
    const chRes = await app.handle(
      new Request(`http://localhost/api/v1/courses/${courseId}/chapters`, {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({ title: 'Chapter 1: Architecture' }),
      })
    );
    expect(chRes.status).toBe(201);
    const chData = ((await chRes.json()) as any).data;
    expect(chData.orderIndex).toBe(1);
    chapterId = chData.id;

    const patchChRes = await app.handle(
      new Request(`http://localhost/api/v1/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: inst1Headers,
        body: JSON.stringify({ title: 'Chapter 1: Updated Architecture' }),
      })
    );
    expect(patchChRes.status).toBe(200);

    // 5. Constraint 6: Tạo Chapter trùng orderIndex = 1 -> 409 DUPLICATE_ORDER_INDEX
    const dupChRes = await app.handle(
      new Request(`http://localhost/api/v1/courses/${courseId}/chapters`, {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({ title: 'Duplicate Chapter', orderIndex: 1 }),
      })
    );
    expect(dupChRes.status).toBe(409);
    expect(((await dupChRes.json()) as any).error.code).toBe('DUPLICATE_ORDER_INDEX');

    // 6. Tạo Lesson 1 & Lesson 2, cập nhật Lesson 1
    const l1Res = await app.handle(
      new Request(`http://localhost/api/v1/chapters/${chapterId}/lessons`, {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({ title: 'Lesson 1: REST & JWT' }),
      })
    );
    expect(l1Res.status).toBe(201);
    lesson1Id = ((await l1Res.json()) as any).data.id;

    const patchL1Res = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}`, {
        method: 'PATCH',
        headers: inst1Headers,
        body: JSON.stringify({ title: 'Lesson 1: REST, JWKS & JWT' }),
      })
    );
    expect(patchL1Res.status).toBe(200);

    const l2Res = await app.handle(
      new Request(`http://localhost/api/v1/chapters/${chapterId}/lessons`, {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({ title: 'Lesson 2: Drizzle & pgvector' }),
      })
    );
    expect(l2Res.status).toBe(201);
    lesson2Id = ((await l2Res.json()) as any).data.id;

    // 7. Constraint 7 & 8: Gắn cờ RAG cho video material -> 400 INVALID_RAG_SOURCE_TYPE
    const badRagRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/materials`, {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({
          type: 'video',
          title: 'Intro Video',
          contentUrl: 'https://example.com/v.mp4',
          isRagSource: true,
        }),
      })
    );
    expect(badRagRes.status).toBe(400);
    expect(((await badRagRes.json()) as any).error.code).toBe('INVALID_RAG_SOURCE_TYPE');

    // 8. Tạo Markdown Material hợp lệ có isRagSource = true (201) và cập nhật Material
    const validMatRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/materials`, {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({
          type: 'markdown',
          title: 'JWT RS256 Notes',
          textContent: '# RS256 uses asymmetric key pairs',
          isRagSource: true,
        }),
      })
    );
    expect(validMatRes.status).toBe(201);
    material1Id = ((await validMatRes.json()) as any).data.id;

    const patchMatRes = await app.handle(
      new Request(`http://localhost/api/v1/materials/${material1Id}`, {
        method: 'PATCH',
        headers: inst1Headers,
        body: JSON.stringify({ title: 'Updated JWT RS256 Notes' }),
      })
    );
    expect(patchMatRes.status).toBe(200);
  });

  it('Stage 3 & Constraint 2, 4, 5: Should enforce enrollment rules, sequential access, and monotonic progress', async () => {
    // 1. Constraint 2: Instructor không được enroll (403)
    const selfEnrollRes = await app.handle(
      new Request(`http://localhost/api/v1/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: inst1Headers,
      })
    );
    expect(selfEnrollRes.status).toBe(403);

    // 2. Learner enroll khóa học (201) và xem danh sách khóa đã đăng ký (200)
    const enrollRes = await app.handle(
      new Request(`http://localhost/api/v1/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: learnerHeaders,
      })
    );
    expect(enrollRes.status).toBe(201);

    const myEnrollRes = await app.handle(
      new Request('http://localhost/api/v1/my/enrollments', { headers: learnerHeaders })
    );
    expect(myEnrollRes.status).toBe(200);

    // 3. Enroll trùng lần 2 -> 409 ALREADY_ENROLLED
    const dupEnrollRes = await app.handle(
      new Request(`http://localhost/api/v1/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: learnerHeaders,
      })
    );
    expect(dupEnrollRes.status).toBe(409);

    // 4. Constraint 4: Learner nhảy cóc vào Lesson 2 khi chưa học Lesson 1 -> 403 SEQUENTIAL_PREREQUISITE_FAILED
    const skipRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson2Id}/access`, {
        headers: learnerHeaders,
      })
    );
    expect(skipRes.status).toBe(403);
    expect(((await skipRes.json()) as any).error.code).toBe('SEQUENTIAL_PREREQUISITE_FAILED');

    // 5. Admin & Owner Instructor được phép truy cập thẳng Lesson 2 (200)
    const adminAccRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson2Id}/access`, { headers: adminHeaders })
    );
    expect(adminAccRes.status).toBe(200);

    // 6. Learner học Lesson 1 (200) -> Complete Lesson 1 (200) -> Mở khóa Lesson 2 (200)
    const l1AccRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/access`, { headers: learnerHeaders })
    );
    expect(l1AccRes.status).toBe(200);

    const comp1Res = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/complete`, {
        method: 'POST',
        headers: learnerHeaders,
      })
    );
    expect(comp1Res.status).toBe(200);

    const l2AccRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson2Id}/access`, { headers: learnerHeaders })
    );
    expect(l2AccRes.status).toBe(200);

    // 7. Constraint 5: Complete Lesson 2 rồi gọi lại Complete Lesson 1 -> lastAccessedLessonId vẫn giữ ở Lesson 2
    await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson2Id}/complete`, {
        method: 'POST',
        headers: learnerHeaders,
      })
    );
    const reCompleteL1 = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/complete`, {
        method: 'POST',
        headers: learnerHeaders,
      })
    );
    expect(((await reCompleteL1.json()) as any).data.lastAccessedLessonId).toBe(lesson2Id);
  });

  it('Stage 4 & Constraint 3, 9, 10: Should manage discussions, notifications, and internal RAG export', async () => {
    // 1. Constraint 10: Bình luận chỉ chứa khoảng trắng -> 400 EMPTY_TEXT_CONTENT
    const emptyDiscRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/discussions`, {
        method: 'POST',
        headers: learnerHeaders,
        body: JSON.stringify({ textContent: '    ' }),
      })
    );
    expect(emptyDiscRes.status).toBe(400);
    expect(((await emptyDiscRes.json()) as any).error.code).toBe('EMPTY_TEXT_CONTENT');

    // 2. Learner tạo câu hỏi gốc ở Lesson 1 (201)
    const rootRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/discussions`, {
        method: 'POST',
        headers: learnerHeaders,
        body: JSON.stringify({ textContent: 'How does JWKS work between M1 and M2?' }),
      })
    );
    expect(rootRes.status).toBe(201);
    rootDiscussionId = ((await rootRes.json()) as any).data.id;

    // 3. Constraint 9: Reply vào câu hỏi của Lesson 1 nhưng gọi từ endpoint của Lesson 2 -> 400 CROSS_LESSON_REPLY_FORBIDDEN
    const crossReplyRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson2Id}/discussions`, {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({ textContent: 'Cross lesson reply', parentId: rootDiscussionId }),
      })
    );
    expect(crossReplyRes.status).toBe(400);
    expect(((await crossReplyRes.json()) as any).error.code).toBe('CROSS_LESSON_REPLY_FORBIDDEN');

    // 4. Instructor 1 reply hợp lệ ở Lesson 1 (201) -> Sinh Notification cho Learner
    const validReplyRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/discussions`, {
        method: 'POST',
        headers: inst1Headers,
        body: JSON.stringify({
          textContent: 'M2 verifies RS256 tokens using M1 public key!',
          parentId: rootDiscussionId,
        }),
      })
    );
    expect(validReplyRes.status).toBe(201);

    // Xem danh sách bình luận cha-con của Lesson 1 (200)
    const listDiscRes = await app.handle(
      new Request(`http://localhost/api/v1/lessons/${lesson1Id}/discussions`, {
        headers: learnerHeaders,
      })
    );
    expect(listDiscRes.status).toBe(200);

    // 5. Constraint 3: Instructor 1 cố tình sửa câu hỏi của Learner -> 403 NOT_AUTHOR; Learner tự sửa -> 200
    const nonAuthorEditRes = await app.handle(
      new Request(`http://localhost/api/v1/discussions/${rootDiscussionId}`, {
        method: 'PATCH',
        headers: inst1Headers,
        body: JSON.stringify({ textContent: 'Edited by non-author' }),
      })
    );
    expect(nonAuthorEditRes.status).toBe(403);

    const authorEditRes = await app.handle(
      new Request(`http://localhost/api/v1/discussions/${rootDiscussionId}`, {
        method: 'PATCH',
        headers: learnerHeaders,
        body: JSON.stringify({ textContent: 'Updated question by Learner' }),
      })
    );
    expect(authorEditRes.status).toBe(200);

    // 6. Kiểm tra Notification của Learner và đánh dấu đã đọc (200)
    const notifListRes = await app.handle(
      new Request('http://localhost/api/v1/notifications', { headers: learnerHeaders })
    );
    expect(notifListRes.status).toBe(200);
    const notifs = ((await notifListRes.json()) as any).data;
    expect(notifs.length).toBeGreaterThanOrEqual(1);

    const markReadRes = await app.handle(
      new Request(`http://localhost/api/v1/notifications/${notifs[0].id}/read`, {
        method: 'PATCH',
        headers: learnerHeaders,
      })
    );
    expect(markReadRes.status).toBe(200);
    expect(((await markReadRes.json()) as any).data.isRead).toBe(true);

    // 7. Kiểm tra cổng tích hợp nội bộ /internal/rag-materials cho M4 AI Tutor
    const unauthInternal = await app.handle(new Request('http://localhost/internal/rag-materials'));
    expect(unauthInternal.status).toBe(401);

    if (env.INTERNAL_SERVICE_KEY) {
      const validInternal = await app.handle(
        new Request('http://localhost/internal/rag-materials', {
          headers: { 'x-internal-service-key': env.INTERNAL_SERVICE_KEY },
        })
      );
      expect(validInternal.status).toBe(200);
      const ragItems = ((await validInternal.json()) as any).data;
      expect(ragItems.some((item: any) => item.courseId === courseId)).toBe(true);
    }

    // 8. Kiểm tra xóa Discussion (204) và xóa Course (204)
    const delDiscRes = await app.handle(
      new Request(`http://localhost/api/v1/discussions/${rootDiscussionId}`, {
        method: 'DELETE',
        headers: learnerHeaders,
      })
    );
    expect(delDiscRes.status).toBe(204);

    const delCourseRes = await app.handle(
      new Request(`http://localhost/api/v1/courses/${courseId}`, {
        method: 'DELETE',
        headers: inst1Headers,
      })
    );
    expect(delCourseRes.status).toBe(204);
  });
});