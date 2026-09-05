# Frontend Rules — DevVerse LMS

## Component Structure
- Mỗi component trong file riêng
- Props phải có TypeScript types rõ ràng (không dùng any)
- Không fetch data trực tiếp từ Supabase trong components — dùng hooks/services

## State Management
- Server state: React Query / TanStack Query
- Client state: Zustand (nếu cần global state)
- Form state: React Hook Form

## Authentication
- Sử dụng Supabase Auth
- Token tự động refresh qua Supabase client
- Protected routes kiểm tra session trước khi render

## Code Editor (judge submissions)
- Sử dụng Monaco Editor (same as VS Code)
- Hỗ trợ tối thiểu: Python, JavaScript, Java, C++

## Performance
- Image optimization (Next.js Image component)
- Code splitting cho large components (dynamic import)
- Loading states cho tất cả async operations

## Accessibility
- Semantic HTML elements
- Alt text cho images
- Keyboard navigation cho quiz/editor
- ARIA labels cho interactive elements
