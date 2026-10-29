# Multi-stage Dockerfile optimized for Bun (~80MB image)

# Stage 1: Base image using Bun latest matching our v1.4 lockfile
FROM oven/bun:latest AS base
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS dependencies
COPY package.json bun.lock* ./
RUN bun install --production

# Stage 3: Release image
FROM base AS release
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
