import { Elysia } from 'elysia';
import { authPlugin, requireRoles } from '../../../middlewares/auth.middleware';
import { ok } from '../../../utils/response';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentParamSchema } from './enrollment.schema';

export const enrollmentRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  // TODO: Gắn 4 endpoints của Mục 6.2.2:
  // 1. POST /courses/:id/enroll      (Role: Learner, status 201)
  // 2. GET  /my/enrollments          (Role: Learner)
  // 3. GET  /lessons/:id/access      (Role: Learner)
  // 4. POST /lessons/:id/complete    (Role: Learner)
  ;