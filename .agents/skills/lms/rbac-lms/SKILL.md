---
name: rbac-lms
description: Hướng dẫn triển khai RBAC (Role-Based Access Control) cho DevVerse LMS với 3 roles: Student, Instructor, Admin. Bao gồm middleware patterns, Supabase RLS integration, và route protection.
---

# RBAC LMS Skill — DevVerse

## 3 Roles trong DevVerse

| Role | Permissions |
|---|---|
| **Student** | View enrolled courses, submit code, take quizzes, chat with AI Tutor |
| **Instructor** | Create/edit own courses, manage students, grade assignments, view analytics |
| **Admin** | Full access: manage all users/courses, system settings, plagiarism reports |

## 1. Role Definition

```typescript
export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

export const ROLE_PERMISSIONS = {
  [UserRole.STUDENT]: [
    'course:view',
    'course:enroll',
    'submission:create',
    'quiz:take',
    'ai-tutor:query',
    'progress:view-own',
  ],
  [UserRole.INSTRUCTOR]: [
    'course:create',
    'course:edit-own',
    'course:view-own-students',
    'assignment:grade',
    'analytics:view-own',
  ],
  [UserRole.ADMIN]: [
    'user:manage',
    'course:manage-all',
    'plagiarism:view',
    'system:config',
  ],
} as const
```

## 2. Middleware (Node.js/Express/Elysia)

```typescript
// middleware/auth.ts
import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req: Request): Promise<User> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new UnauthorizedError('No token provided')

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw new UnauthorizedError('Invalid token')

  return user
}

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await requireAuth(req)
    const userRole = user.user_metadata?.role as UserRole

    if (!roles.includes(userRole)) {
      throw new ForbiddenError(`Requires role: ${roles.join(' or ')}`)
    }

    req.user = user
    next()
  }
}

// Usage:
app.get('/admin/users', requireRole(UserRole.ADMIN), adminController.listUsers)
app.post('/courses', requireRole(UserRole.INSTRUCTOR, UserRole.ADMIN), courseController.create)
app.post('/submissions', requireRole(UserRole.STUDENT), submissionController.create)
```

## 3. FastAPI (Python)

```python
from fastapi import Depends, HTTPException, status
from supabase import create_client

async def get_current_user(token: str = Depends(oauth2_scheme)):
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    response = supabase.auth.get_user(token)
    if not response.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return response.user

def require_role(*roles: str):
    async def role_checker(current_user=Depends(get_current_user)):
        user_role = current_user.user_metadata.get('role')
        if user_role not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {roles}")
        return current_user
    return role_checker

# Usage:
@router.get("/admin/users")
async def list_users(user=Depends(require_role("admin"))):
    ...

@router.post("/courses")
async def create_course(user=Depends(require_role("instructor", "admin"))):
    ...
```

## 4. Supabase RLS (database-level enforcement)

```sql
-- Đây là tầng bảo vệ thứ 2 — ngay cả khi middleware bị bypass

-- Student chỉ xem submissions của mình
CREATE POLICY "students_own_submissions"
ON submissions FOR ALL
USING (user_id = auth.uid());

-- Instructor chỉ edit courses của mình
CREATE POLICY "instructor_own_courses"
ON courses FOR UPDATE
USING (
  instructor_id = auth.uid()
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor'
);

-- Admin xem tất cả plagiarism reports
CREATE POLICY "admin_plagiarism_reports"
ON plagiarism_reports FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);
```

## 5. Frontend Route Guards (Next.js)

```typescript
// middleware.ts (Next.js App Router)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // Protect admin routes
  if (path.startsWith('/admin')) {
    if (!session || session.user.user_metadata?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  // Protect instructor routes
  if (path.startsWith('/instructor')) {
    const role = session?.user.user_metadata?.role
    if (!role || !['instructor', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  return res
}
```

## Khi nào activate skill này

- Setup authentication/authorization
- Add new protected endpoint
- Debug 403 Forbidden errors
- Review security của any API endpoint
- Implement new role or permission
