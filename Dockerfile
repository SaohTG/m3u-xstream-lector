# ---------- Build stage ----------
FROM node:20-bookworm AS build
WORKDIR /app

# Outils requis pour compiler argon2 (node-gyp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Installe les deps
COPY package.json ./
# Utilise npm ci si le lockfile existe, sinon npm install
# (tu peux ajouter "package-lock.json" dans la ligne COPY si tu l'as commité)
RUN if [ -f package-lock.json ]; then \
      echo "Using npm ci" && npm ci --no-audit --no-fund ; \
    else \
      echo "Using npm install" && npm install --no-audit --no-fund ; \
    fi

# Copie le reste du code et build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copie l'app buildée
COPY --from=build /app ./

# Port Next.js
EXPOSE 3000

# Le compose lance la migration puis start (voir docker-compose)
CMD ["npm","run","start"]
