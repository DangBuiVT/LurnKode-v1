import { Elysia } from 'elysia';
import { ok } from '../../utils/response';
import { courseRoutes } from './courses/course.routes';
import { enrollmentRoutes } from './enrollments/enrollment.routes';
import { interactionRoutes } from './interactions/interaction.routes';
import { internalRoutes } from './internal/internal.routes';

export const m2LearningModule = new Elysia({ name: 'm2-learning-module' })
  .get('/api/v1/m2/status', () => ok({ module: 'M2 Learning Management', ready: true }))
  .use(courseRoutes)
  .use(enrollmentRoutes)
  .use(interactionRoutes)
  .use(internalRoutes);