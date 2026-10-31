// apps/api/src/modules/m2-learning/internal/internal.routes.ts
import { Elysia } from 'elysia';
import { verifyInternalServiceKey } from '../../../middlewares/internal.middleware';
import { ok } from '../../../utils/response';
import { InternalRagService } from './internal.service';

export const internalRoutes = new Elysia().get('/internal/rag-materials', async ({ headers }) => {
  verifyInternalServiceKey(headers);
  const data = await InternalRagService.exportRagMaterials();
  return ok(data);
});