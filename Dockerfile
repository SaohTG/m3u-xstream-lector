# ---------- Build stage ----------
FROM node:20-bookworm AS build
WORKDIR /app

# NPM plus tolérant/retry
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_PROGRESS=false
RUN npm config set legacy-peer-deps true \
 && npm config set registry https://registry.npmjs.org/ \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000

# Dépendances
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      echo "Using npm ci" && npm ci --no-audit --no-fund ; \
    else \
      echo "Using npm install" && npm install --no-audit --no-fund ; \
    fi

# Code + build
COPY . .
RUN npx prisma generate && npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm","run","start"]
