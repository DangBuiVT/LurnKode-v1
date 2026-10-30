import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { env } from './config/env';
import { AppError } from './utils/errors';
import { fail } from './utils/response';
import { m2LearningModule } from './modules/m2-learning';

export const app = new Elysia()
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'LurnKode API — M2 Learning Management',
          version: '1.0.0',
        },
      },
    })
  )
  .use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    })
  )
  .onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return fail(error.code, error.message, error.details);
    }
    if (code === 'VALIDATION') {
      set.status = 400;
      return fail('VALIDATION_ERROR', 'Invalid request payload or parameters.', {
        summary: error.message,
      });
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return fail('ROUTE_NOT_FOUND', 'The requested API endpoint does not exist.');
    }
    console.error('🔥 [UNHANDLED ERROR]:', error);
    set.status = 500;
    return fail('INTERNAL_SERVER_ERROR', 'An unexpected server error occurred.');
  })
  .get('/health', () => ({ status: 'ok', version: '0.1.0' }))
  .use(m2LearningModule)
  .listen(env.PORT);

console.log(`🚀 LurnKode API running at http://${app.server?.hostname}:${app.server?.port}`);
console.log(`📖 Swagger UI available at http://localhost:${env.PORT}/docs`);