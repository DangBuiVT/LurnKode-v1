# Frontend Rules — LurnKode LMS

## Framework
- **Next.js + TypeScript** (App Router) — đã xác nhận
- Không sử dụng React+Vite cho dự án này

## Component Structure
- Mỗi component trong file riêng
- Props phải có TypeScript types rõ ràng (không dùng `any`)
- Không fetch data trực tiếp từ database — luôn gọi qua Backend REST API

## State Management
- Server state: React Query / TanStack Query
- Client state: Zustand (nếu cần global state)
- Form state: React Hook Form

## Authentication
- Auth được xử lý qua Backend REST API (JWT)
- Token lưu trong httpOnly cookie hoặc memory — không lưu trong localStorage
- Protected routes kiểm tra session/token trước khi render
- Không gọi database trực tiếp cho auth từ frontend

## Code Editor (judge submissions)
- Sử dụng Monaco Editor (same as VS Code)
- Hỗ trợ tối thiểu: Python, JavaScript, Java, C++

## Performance
- Image optimization (Next.js `Image` component)
- Code splitting cho large components (`dynamic import`)
- Loading states cho tất cả async operations

## Accessibility
- Semantic HTML elements
- Alt text cho images
- Keyboard navigation cho quiz/editor
- ARIA labels cho interactive elements
