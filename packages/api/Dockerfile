# Builder
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
RUN pnpm install --filter @novastream/api... --filter @novastream/shared...
COPY packages/shared packages/shared
RUN pnpm -C packages/shared build
COPY packages/api packages/api
RUN pnpm -C packages/api build

# Runner
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json .
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node","dist/main.js"]
