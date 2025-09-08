# ----------- Build -----------
FROM node:20-alpine AS build
WORKDIR /app

# 1) copier les manifestes
COPY package.json package-lock.json* ./

# 2) config NPM + cache + installation robuste
#    - pas d'audit/fund
#    - retry/réseau plus tolérant
#    - cache npm pour accélérer
RUN npm config set fund false \
 && npm config set audit false \
 && npm config set progress false \
 && npm config set fetch-retries 5 \
 && npm config set fetch-timeout 600000 \
 && npm config set fetch-retry-maxtimeout 600000

# Si tu as un package-lock.json valide: on tente 'ci', sinon on tombe sur 'install'
# --legacy-peer-deps pour ignorer les conflits de peer deps (souvent la cause du exit 1)
RUN --mount=type=cache,target=/root/.npm \
    (npm ci --no-audit --no-fund || npm install --legacy-peer-deps --no-optional)

# 3) copier le reste du code
COPY . .

# 4) variables Vite et build
ARG VITE_API_URL=/api
ARG BUILD_ID=1
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=2048
RUN echo "BUILD_ID=${BUILD_ID}"
RUN npm run build

# ----------- Runtime -----------
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
