# -------- Build --------
FROM node:20-alpine AS build
WORKDIR /app

# Manifeste(s)
COPY package.json package-lock.json* ./

# Config NPM + logs verbeux (pour voir la vraie erreur)
RUN npm config set fund false \
 && npm config set audit false \
 && npm config set progress false \
 && npm config set loglevel verbose \
 && npm config set fetch-retries 5 \
 && npm config set fetch-timeout 600000 \
 && npm config set registry https://registry.npmjs.org/

# Install robuste (SANS npm ci) + affichage logs si erreur
RUN npm install --legacy-peer-deps --no-optional || (echo "----- NPM LOGS -----"; ls -la /root/.npm/_logs || true; cat /root/.npm/_logs/* 2>/dev/null || true; exit 1)

# Code
COPY . .

# Variables pour Vite
ARG VITE_API_URL=/api
ARG BUILD_ID=1
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=2048

# Build
RUN npm run build || (echo "----- BUILD LOGS (npm) -----"; ls -la /root/.npm/_logs || true; cat /root/.npm/_logs/* 2>/dev/null || true; exit 1)

# -------- Runtime --------
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
