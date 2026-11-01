# ========================================================
# Dockerfile for LurnKode M1 & M2 API Backend (Bun + Elysia)
# ========================================================
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# 1. Cài đặt dependencies
COPY package.json bun.lock* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install

# 2. Sao chép toàn bộ mã nguồn
COPY . .

# 3. Expose port 8000
EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

# 4. Tự động chạy migrations và khởi động server Elysia
CMD ["sh", "-c", "bun run db:migrate && bun run src/index.ts"]

