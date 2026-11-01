import { Elysia } from 'elysia';
import { authPlugin, requireRoles } from '../../../middlewares/auth.middleware';
import { ok } from '../../../utils/response';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentParamSchema } from './enrollment.schema';

export const enrollmentRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  // TODO: Gắn 5 endpoints của Mục 6.2.2:
  // 1. POST /courses/:id/enroll      (Role: Learner, status 201)
  .post(
    '/courses/:id/enroll',
    async ({params, user, set}) => {
      const authUser = requireRoles(user, ['Learner']);
      const enrollment = await EnrollmentService.enrollCourse(params.id, authUser);
      set.status = 201;
      return ok(enrollment);
    },
    {params: EnrollmentParamSchema}
  )

  //Bổ sung DELETE /courses/:id/enroll`
  .delete(
    '/courses/:id/enroll',
    async ({ params, user, set }) => {
      const authUser = requireRoles(user, ['Learner']);
      await EnrollmentService.leaveCourse(params.id, authUser);
      set.status = 204;
    },
    { params: EnrollmentParamSchema }
  )

  // 2. GET  /my/enrollments          (Role: Learner)
  .get(
    '/my/enrollments',
    async ({user}) => {
      const authUser = requireRoles(user, ['Learner']);
      const result = await EnrollmentService.getMyEnrollments(authUser.id);
      return ok(result);
    }
  )

  // 3. GET  /lessons/:id/access      (Role: Learner)
  .get(
    '/lessons/:id/access',
    async ({params, user}) => {
      const authUser = requireRoles(user, ['Learner', 'Admin', 'Instructor']);
      const result = await EnrollmentService.accessLessonMaterials(params.id, authUser);
      return ok(result);
    },
    {params: EnrollmentParamSchema}
  )

  // 4. POST /lessons/:id/complete    (Role: Learner, Instructor, Admin)
  .post(
    '/lessons/:id/complete',
    async ({params, user}) => {
      const authUser = requireRoles(user, ['Learner']);
      const lesson = await EnrollmentService.completeLesson(params.id, authUser);
      return ok(lesson);
    },
    {params: EnrollmentParamSchema}
  );