# ---------- Builder ----------
FROM node:20-slim AS builder
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

WORKDIR /app
# Outils de build (sûr, même si pas toujours nécessaires côté API)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ ca-certificates git curl && \
  rm -rf /var/lib/apt/lists/*

# Copie TOUT le monorepo (workspace PNPM)
COPY . .

# DEBUG réseau (facultatif) : montre la version + registry
RUN node -v && pnpm -v && pnpm config get registry

# Install monorepo (pas de lockfile -> no-frozen-lockfile)
# En cas d'échec, affiche le log PNPM pour diagnostic
RUN pnpm install --no-frozen-lockfile --reporter=append-only || (test -f .pnpm-debug.log && cat .pnpm-debug.log; exit 1)

# Build shared puis API
RUN pnpm -C packages/shared build
RUN pnpm -C packages/api build

# ---------- Runner ----------
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node","dist/main.js"]
