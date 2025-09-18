# ---------- Build stage ----------
FROM node:20-bookworm AS build
WORKDIR /app

# Configure NPM pour éviter la casse (peer deps, audit, etc.)
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_PROGRESS=false
# Évite les erreurs ERESOLVE
RUN npm config set legacy-peer-deps true

# 1) Installer les deps à partir des manifests
COPY package.json ./
# Si tu commits un package-lock.json plus tard, ajoute-le à la ligne COPY ci-dessus.
RUN npm install --omit=optional --ignore-scripts --no-audit --no-fund --loglevel=verbose

# 2) Copier le reste du code
COPY . .

# 3) Générer Prisma + builder Next
RUN npx prisma generate && npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm","run","start"]
