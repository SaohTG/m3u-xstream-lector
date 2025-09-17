FROM node:20-slim AS builder
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ ca-certificates git curl && rm -rf /var/lib/apt/lists/*

COPY . .
# ↓↓↓ Remplace par cette ligne simple
RUN pnpm install --no-frozen-lockfile

RUN pnpm -C packages/shared build
RUN pnpm -C packages/api build
