import { Elysia } from 'elysia';
import { authPlugin, requireAuth, requireRoles } from '../../../middlewares/auth.middleware';
import { ok } from '../../../utils/response';
import { InteractionService } from './interaction.service';

export const interactionRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  // TODO: Gắn 6 endpoints của Mục 6.2.3:
  // 1. GET    /lessons/:lessonId/discussions
  // 2. POST   /lessons/:lessonId/discussions
  // 3. PATCH  /discussions/:id
  // 4. DELETE /discussions/:id
  // 5. GET    /notifications
  // 6. PATCH  /notifications/:id/read
  ;