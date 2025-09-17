# Builder
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
WORKDIR /app

# --- variables build-time pour Next.js ---
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/web/package.json packages/web/
RUN pnpm install --filter @novastream/web... --filter @novastream/shared...

COPY packages/shared packages/shared
RUN pnpm -C packages/shared build

COPY packages/web packages/web
RUN pnpm -C packages/web build

# Runner
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/web/.next /app/.next
COPY --from=builder /app/packages/web/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
EXPOSE 3000
CMD ["node","node_modules/next/dist/bin/next","start","-p","3000"]
