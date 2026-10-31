import { Elysia } from 'elysia';
import { authPlugin, requireRoles } from '../../../middlewares/auth.middleware';
import { ok, paginated } from '../../../utils/response';
import { CourseService } from './course.service';
import {
  IdParamSchema,
  CreateCourseBodySchema,
  ListCoursesQuerySchema,
  UpdateCourseBodySchema,
  CreateChapterBodySchema,
  UpdateChapterBodySchema,
  CreateLessonBodySchema,
  UpdateLessonBodySchema,
  CreateMaterialBodySchema,
  UpdateMaterialBodySchema,
} from './course.schema';

export const courseRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)

  // 1. POST /api/v1/courses
  .post(
    '/courses',
    async ({ user, body, set }) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      const course = await CourseService.createCourse(authUser, body);
      set.status = 201;
      return ok(course);
    },
    { body: CreateCourseBodySchema }
  )

  // 2. GET /api/v1/courses
  .get(
    '/courses',
    async ({ query }) => {
      // TODO: Gọi CourseService.listPublishedCourses(query.page, query.limit, query.search)
      // và trả về bằng hàm paginated(items, page, limit, total)
      const result = await CourseService.listPublishedCourses(query.page, query.limit, query.search);
      return paginated(result.items, result.page, result.limit, result.total);
    },
    { query: ListCoursesQuerySchema }
  )

  // 3. GET /api/v1/courses/:id
  .get(
    '/courses/:id',
    async ({ params }) => {
      // TODO: Gọi CourseService.getCourseDetails(params.id) và trả về ok(...)
      const detail = await CourseService.getCourseDetails(params.id);
      return ok(detail);
    },
    { params: IdParamSchema }
  )

  // 4. PATCH /api/v1/courses/:id
  .patch(
    '/courses/:id',
    async ({ params, body, user }) => {
      // TODO: Kiểm tra requireRoles(user, ['Instructor', 'Admin']), gọi CourseService.updateCourse và trả về ok(...)
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      const update = await CourseService.updateCourse(params.id, authUser, body);
      return ok(update);
    },
    { params: IdParamSchema, body: UpdateCourseBodySchema }
  )

  // 5. DELETE /api/v1/courses/:id
  .delete(
    '/courses/:id',
    async ({ params, user, set }) => {
      // TODO: Kiểm tra requireRoles, gọi CourseService.deleteCourse, đặt set.status = 204 và return
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      await CourseService.deleteCourse(params.id, authUser);
      set.status = 204;
    },
    { params: IdParamSchema }
  )

  // 6.  POST   /courses/:id/chapters
  .post(
    '/courses/:id/chapters',
    async({params, user, body, set}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      const chapter = await CourseService.createChapter(params.id, authUser, body);
      set.status = 201;
      return ok(chapter);
    },
    {params: IdParamSchema, body: CreateChapterBodySchema}
  )

  // 7.  PATCH  /chapters/:id
  .patch(
    '/chapters/:id',
    async({params, user, body}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      const update = await CourseService.updateChapter(params.id, authUser, body);
      return ok(update);
    },
    {params: IdParamSchema, body: UpdateChapterBodySchema}
  )

  // 8.  DELETE /chapters/:id
  .delete(
    '/chapters/:id',
    async({params, user, set}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      await CourseService.deleteChapter(params.id, authUser);
      set.status = 204;
    },
    {params: IdParamSchema}
  )

  // 9.  POST   /chapters/:id/lessons
  .post(
    '/chapters/:id/lessons',
    async({params, user, body, set}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      const lesson = await CourseService.createLesson(params.id, authUser, body);
      set.status = 201;
      return ok(lesson);
    },
    {params: IdParamSchema, body: CreateLessonBodySchema}
  )

  // 10. PATCH  /lessons/:id
  .patch(
    '/lessons/:id',
    async({params, user, body}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      const update = await CourseService.updateLesson(params.id, authUser, body);
      return ok(update);
    },
    {params: IdParamSchema, body: UpdateLessonBodySchema}
  )

  // 11. DELETE /lessons/:id
  .delete(
    '/lessons/:id',
    async({params, user, set}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      await CourseService.deleteLesson(params.id, authUser);
      set.status = 204;
    },
    {params: IdParamSchema}
  )

  // 12. POST   /lessons/:id/materials
  .post(
    '/lessons/:id/materials',
    async({params, user, body, set}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      const material = await CourseService.createMaterial(params.id, authUser, body);
      set.status = 201;
      return ok(material);
    },
    {params: IdParamSchema, body: CreateMaterialBodySchema}
  )

  // 13. PATCH  /materials/:id
  .patch(
    '/materials/:id',
    async({params, user, body}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      const update = await CourseService.updateMaterial(params.id, authUser, body);
      return ok(update);
    },
    {params: IdParamSchema, body: UpdateMaterialBodySchema}
  )

  // 14. DELETE /materials/:id
  .delete(
    '/materials/:id',
    async({params, user, set}) => {
      const authUser = requireRoles(user, ['Instructor', 'Admin']);
      await CourseService.deleteMaterial(params.id, authUser);
      set.status = 204;
    },
    {params: IdParamSchema}
  );