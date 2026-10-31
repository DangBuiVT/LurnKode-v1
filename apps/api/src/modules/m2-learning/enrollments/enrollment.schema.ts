import { t } from 'elysia';

export const EnrollmentParamSchema = t.Object({
  id: t.String({ format: 'uuid' }),
});