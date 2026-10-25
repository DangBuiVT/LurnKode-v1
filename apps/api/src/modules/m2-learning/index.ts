import { Elysia } from 'elysia';
import { ok } from '../../utils/response';

export const m2LearningModule = new Elysia({ name: 'm2-learning-module' }).get(
  '/api/v1/m2/status',
  () => ok({ module: 'M2 Learning Management', ready: true })
);