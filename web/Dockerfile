# --- Build stage ---
FROM node:20-bullseye-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
# installation robuste (fonctionne même sans lockfile)
RUN npm ci --no-audit --no-fund || npm i --no-audit --no-fund
COPY . .
# passer VITE_API_URL au build (depuis docker-compose)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# --- Runtime stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
