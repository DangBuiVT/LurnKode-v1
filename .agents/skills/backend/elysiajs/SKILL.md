---
name: elysiajs
description: Hướng dẫn build REST API với Bun + ElysiaJS + TypeScript cho DevVerse backend. Bao gồm project structure, validation, middleware, plugins, và Supabase integration.
---

# ElysiaJS Skill — DevVerse Backend (Bun)

## Project Structure

```
apps/api/
├── src/
│   ├── index.ts             ← Entry point
│   ├── config.ts            ← Environment config
│   ├── database.ts          ← Supabase client
│   ├── plugins/
│   │   ├── auth.plugin.ts   ← JWT / Supabase auth
│   │   └── rate-limit.plugin.ts
│   ├── routes/
│   │   ├── courses.ts
│   │   ├── submissions.ts
│   │   ├── quiz.ts
│   │   └── ai-tutor.ts
│   └── services/
│       ├── judge0.service.ts
│       └── rag.service.ts
├── tests/
├── package.json
└── bunfig.toml
```

## 1. Main App (Elysia)

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { swagger } from '@elysiajs/swagger'
import { coursesRouter } from './routes/courses'
import { submissionsRouter } from './routes/submissions'

const app = new Elysia()
  .use(swagger({ path: '/docs' }))
  .use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  }))
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!
  }))
  .get('/health', () => ({ status: 'ok' }))
  .use(coursesRouter)
  .use(submissionsRouter)
  .listen(3001)

console.log(`🦊 DevVerse API running at ${app.server?.url}`)
```

## 2. Auth Plugin

```typescript
// plugins/auth.plugin.ts
import { Elysia } from 'elysia'
import { createClient } from '@supabase/supabase-js'

export const authPlugin = new Elysia({ name: 'auth' })
  .derive(async ({ headers }) => {
    const token = headers.authorization?.replace('Bearer ', '')
    if (!token) return { user: null }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    return { user: error ? null : user }
  })
  .macro(({ onBeforeHandle }) => ({
    requireRole(roles: string[]) {
      onBeforeHandle(({ user, error }) => {
        if (!user) return error(401, 'Unauthorized')
        const role = user.user_metadata?.role
        if (!roles.includes(role)) return error(403, 'Forbidden')
      })
    }
  }))
```

## 3. Route Example

```typescript
// routes/submissions.ts
import { Elysia, t } from 'elysia'
import { authPlugin } from '../plugins/auth.plugin'
import { enqueueSubmission } from '../services/judge0.service'

export const submissionsRouter = new Elysia({ prefix: '/api/submissions' })
  .use(authPlugin)
  .post('/', async ({ body, user, error }) => {
    if (!user) return error(401)
    if (user.user_metadata?.role !== 'student') return error(403)

    const { data } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        problem_id: body.problemId,
        code: body.code,
        language_id: body.languageId,
        status: 'pending'
      })
      .select()
      .single()

    await enqueueSubmission(data.id)
    return data
  }, {
    body: t.Object({
      problemId: t.String({ format: 'uuid' }),
      code: t.String({ minLength: 1, maxLength: 65536 }),
      languageId: t.Number()
    }),
    requireRole: ['student']
  })
  .get('/:id', async ({ params, user, error }) => {
    if (!user) return error(401)
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()
    return data || error(404)
  })
```

## 4. Elysia Type Safety

```typescript
// Elysia infers types automatically from t.Object()
// No need for separate Zod schemas
import { t } from 'elysia'

const courseSchema = t.Object({
  title: t.String({ minLength: 3, maxLength: 100 }),
  description: t.Optional(t.String()),
  isPublished: t.Boolean()
})
```

## Khi nào activate skill này

- Setup Elysia project từ đầu (Bun backend)
- Add new route với validation
- Build auth middleware
- Debug Elysia plugin issues
- Migrate từ Express/Hono sang Elysia
