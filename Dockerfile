# -------- Build stage --------
FROM node:20-bookworm AS build
WORKDIR /app

# Outils nécessaires à node-gyp (argon2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Installer deps (utilise npm ci si tu as un package-lock.json, sinon npm install)
COPY package.json ./
# Si TU AS package-lock.json, décommente la ligne ci-dessous et commente la suivante:
# COPY package.json package-lock.json ./
# RUN npm ci --no-audit --no-fund
RUN npm install --no-audit --no-fund

# Copier le reste du code et builder
COPY . .
RUN npm run build

# -------- Runtime stage --------
FROM node:20-bookworm AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copier uniquement ce qui est nécessaire
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm","run","start"]
