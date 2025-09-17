FROM node:20-slim AS builder
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:/root/.local/bin:$PATH
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ ca-certificates git curl && rm -rf /var/lib/apt/lists/*

COPY . .
RUN pnpm install --no-frozen-lockfile --no-optional
RUN pnpm -C packages/shared build
RUN pnpm -C packages/web build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/packages/web/.next /app/.next
COPY --from=builder /app/packages/web/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
EXPOSE 3000
CMD ["node","node_modules/next/dist/bin/next","start","-p","3000"]
