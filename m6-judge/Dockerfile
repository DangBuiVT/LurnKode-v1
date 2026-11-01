FROM oven/bun:1.3.14 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src ./src
COPY mock-m3 ./mock-m3
COPY tsconfig.json ./

FROM base AS app
USER bun

# Worker needs the docker CLI (talks to the host daemon through the mounted socket).
FROM base AS worker
COPY --from=docker:27.4-cli /usr/local/bin/docker /usr/local/bin/docker
USER root
