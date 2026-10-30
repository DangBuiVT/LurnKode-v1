import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { env } from '../config/env';
import { Errors } from '../utils/errors';

export type UserRole = 'Admin' | 'Instructor' | 'Learner';

export interface AuthUser {
  id: string;
  role: UserRole;
}

export const authPlugin = new Elysia({ name: 'm2-auth-middleware' })
  .use(
    jwt({
      name: 'jwt',
      secret: env.JWT_SECRET,
    })
  )
  .derive({ as: 'scoped' }, async ({ headers, jwt }): Promise<{ user: AuthUser | null }> => {
    // Cho phép truyền x-test-user-id và x-test-user-role khi dev/test độc lập
    if (env.NODE_ENV !== 'production') {
      const mockId = headers['x-test-user-id'];
      const mockRole = headers['x-test-user-role'] as UserRole | undefined;
      if (mockId && mockRole && ['Admin', 'Instructor', 'Learner'].includes(mockRole)) {
        return { user: { id: mockId, role: mockRole } };
      }
    }

    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null };
    }

    const token = authHeader.slice(7).trim();
    const payload = await jwt.verify(token);
    if (!payload || typeof payload !== 'object') {
      return { user: null };
    }

    const userId = (payload.sub || payload.user_id || payload.id) as string | undefined;
    const role = payload.role as UserRole | undefined;

    if (!userId || !role) {
      return { user: null };
    }

    return { user: { id: userId, role } };
  });

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) throw Errors.Unauthorized();
  return user;
}

export function requireRoles(user: AuthUser | null, allowedRoles: UserRole[]): AuthUser {
  const authenticated = requireAuth(user);
  if (!allowedRoles.includes(authenticated.role)) {
    throw Errors.Forbidden(
      'INSUFFICIENT_ROLE_PERMISSIONS',
      `Access denied. Required role(s): ${allowedRoles.join(', ')}.`
    );
  }
  return authenticated;
}