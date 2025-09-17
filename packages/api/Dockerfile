FROM node:20-slim AS builder
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:/root/.local/bin:$PATH
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ ca-certificates git curl && rm -rf /var/lib/apt/lists/*

COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm -C packages/shared build
RUN pnpm -C packages/api build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node","dist/main.js"]
