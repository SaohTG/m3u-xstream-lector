# ---------- Builder ----------
FROM node:20-slim AS builder
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:/root/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate

WORKDIR /app
# Copie tout le monorepo pour que pnpm voie le workspace
COPY . .
# Outils build si un paquet natif est requis (rare côté API, mais safe)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ ca-certificates git \
  && rm -rf /var/lib/apt/lists/*

# Install à la racine (monorepo)
RUN pnpm install --no-frozen-lockfile
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
