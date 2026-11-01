# ========================================================
# Dockerfile for LurnKode M5 Web UI (Next.js Standalone)
# Dependencies: Bun (cực nhanh) | Build & Run: Node.js (ổn định)
# ========================================================

# 1. Cài đặt dependencies bằng Bun
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# 2. Build ứng dụng bằng Node.js chính thức (tránh bug Bun Turbopack trên Linux Alpine)
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG API_URL=http://localhost:8000
ENV API_URL=$API_URL
ENV NODE_ENV=production

RUN npm run build

# 3. Production Runner siêu nhẹ
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
