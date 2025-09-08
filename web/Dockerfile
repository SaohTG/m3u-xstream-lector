# ---------- Build ----------
FROM node:20-alpine AS build
WORKDIR /app

# 1) Installer deps
COPY package.json package-lock.json* ./
# utilise ci si tu as un package-lock.json; sinon remplace par `npm install --legacy-peer-deps`
RUN npm ci --no-audit --no-fund || npm install --legacy-peer-deps

# 2) Copier les sources
COPY . .

# 3) Variables pour Vite (injectées à la build)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
# option pour éviter l’OOM dans certains builders
ENV NODE_OPTIONS=--max_old_space_size=2048

# 4) Build Vite
RUN npm run build

# ---------- Runtime ----------
FROM nginx:1.25-alpine
# Nginx conf (proxy /api -> service api)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
