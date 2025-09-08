# -------- Build (Debian) --------
FROM node:20-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates python3 make g++ git && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm config set fund false \
 && npm config set audit false \
 && npm config set progress false \
 && npm config set fetch-retries 5 \
 && npm config set fetch-timeout 600000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm install --legacy-peer-deps --no-optional
# Outils build explicitement pinés (sécurise la build)
RUN npm i -D vite@5.2.8 @vitejs/plugin-react@4.2.1 typescript@5.4.5 esbuild@0.21.5

COPY . .
# Sanity checks
RUN test -f index.html || (echo "❌ index.html manquant" && exit 1)
RUN test -f src/main.tsx || (echo "❌ src/main.tsx manquant" && exit 1)
RUN test -f src/App.tsx   || (echo "❌ src/App.tsx manquant" && exit 1)

ARG VITE_API_URL=/api
ARG BUILD_ID=1
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=2048
RUN echo "BUILD_ID=${BUILD_ID}"

RUN node -v && npm -v && npx vite --version || true
RUN npm run build

# -------- Runtime --------
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
