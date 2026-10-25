# Multi-stage Dockerfile for M3 Assessment Microservice
FROM oven/bun:1.2.4-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Development image
FROM base AS development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 4003
CMD ["bun", "run", "src/index.ts"]

# Production build
FROM base AS runner
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 4003
USER bun
CMD ["bun", "run", "src/index.ts"]

