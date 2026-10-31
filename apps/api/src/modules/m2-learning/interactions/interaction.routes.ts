import { Elysia } from 'elysia';
import { authPlugin, requireAuth, requireRoles } from '../../../middlewares/auth.middleware';
import { ok } from '../../../utils/response';
import { InteractionService } from './interaction.service';
import { IdParamSchema } from '../courses/course.schema';
import { CreateDiscussionBodySchema, UpdateDiscussionBodySchema } from './interaction.schema';

export const interactionRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authPlugin)
  // TODO: Gắn 6 endpoints của Mục 6.2.3:
  // 1. GET    /lessons/:id/discussions
  .get(
    '/lessons/:id/discussions',
    async ({params, user}) => {
      const authUser = requireRoles(user, ['Admin', 'Instructor', 'Learner']);
      const result = await InteractionService.listLessonDiscussions(params.id, authUser);
      return ok(result);
    },
    {params: IdParamSchema}
  )

  // 2. POST   /lessons/:id/discussions
  .post(
    '/lessons/:id/discussions',
    async ({params, user, body, set}) => {
      const authUser = requireRoles(user, ['Admin', 'Instructor', 'Learner']);
      const create = await InteractionService.createDiscussion(params.id, authUser, body);
      set.status = 201;
      return ok(create);
    },
    {params: IdParamSchema, body: CreateDiscussionBodySchema}
  )

  // 3. PATCH  /discussions/:id
  .patch(
    '/discussions/:id',
    async ({params, user, body}) => {
      const authUser = requireRoles(user, ['Admin', 'Instructor', 'Learner']);
      const update = await InteractionService.updateDiscussion(params.id, authUser, body.textContent);
      return ok(update);
    },
    {params: IdParamSchema, body: UpdateDiscussionBodySchema}
  )

  // 4. DELETE /discussions/:id
  .delete(
    '/discussions/:id',
    async ({params, user, set}) => {
      const authUser = requireRoles(user, ['Admin', 'Instructor', 'Learner']);
      await InteractionService.deleteDiscussion(params.id, authUser);
      set.status = 204;
    },
    {params: IdParamSchema}
  )

  // 5. GET    /notifications
  .get(
    '/notifications',
    async ({user}) => {
      const authUser = requireRoles(user, ['Admin', 'Instructor', 'Learner']);
      const result = await InteractionService.getUserNotifications(authUser.id);
      return ok(result);
    }
  )

  // 6. PATCH  /notifications/:id/read
  .patch(
    '/notifications/:id/read',
    async ({params, user}) => {
      const authUser = requireRoles(user, ['Admin', 'Instructor', 'Learner']);
      const update = await InteractionService.markNotificationRead(params.id, authUser.id);
      return ok(update);
    },
    {params: IdParamSchema}
  )
  ;