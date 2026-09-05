---
name: nextjs
description: Next.js App Router patterns cho DevVerse frontend. Server Components, Route Handlers, Middleware, và Supabase SSR integration.
---

# Next.js Skill — DevVerse Frontend

## App Router Structure

```
app/
├── (auth)/login/page.tsx
├── (dashboard)/layout.tsx
├── courses/[id]/page.tsx
├── problems/[id]/page.tsx      ← Code editor + Judge
├── api/submissions/route.ts    ← Route Handler
└── middleware.ts               ← Auth guard
```

## Server Components (default)
- Fetch data server-side (không waterfall)
- Không cần useEffect cho initial data

## Client Components
- `'use client'` chỉ khi cần: hooks, events, browser APIs
- Code editor (Monaco), quiz interactivity

## Route Handler

```typescript
// app/api/submissions/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  // Call backend API
}
```

## Supabase SSR

```bash
npm install @supabase/ssr @supabase/supabase-js
```

```typescript
// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}
```

## Khi nào activate skill này
- Build Next.js pages hoặc layouts
- Setup Supabase SSR authentication
- Implement API routes
- Optimize bundle/performance
