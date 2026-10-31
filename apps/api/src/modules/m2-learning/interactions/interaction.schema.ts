import { t } from 'elysia';

export const CreateDiscussionBodySchema = t.Object({
  textContent: t.String({ minLength: 1 }),
  parentId: t.Optional(t.String({ format: 'uuid' })),
});

export const UpdateDiscussionBodySchema = t.Object({
  textContent: t.String({ minLength: 1 }),
});