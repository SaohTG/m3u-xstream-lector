# ---------- Builder ----------
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
WORKDIR /app

# Copie TOUT le monorepo (plus fiable sur Portainer)
COPY . .

# Install à la racine du monorepo (pas de lockfile requis)
# - no-frozen-lockfile évite l'échec si pnpm-lock.yaml n'est pas présent/à jour
RUN pnpm install --no-frozen-lockfile

# Build des libs partagées puis de l'API
RUN pnpm -C packages/shared build
RUN pnpm -C packages/api build

# ---------- Runner ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# on ne copie que ce qui est nécessaire
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/packages/api/package.json ./package.json
# Node modules pour exécuter l'API (pratique : copie globale)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000
CMD ["node","dist/main.js"]
