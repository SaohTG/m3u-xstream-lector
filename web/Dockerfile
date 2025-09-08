# --- Build stage ---
FROM node:20-bullseye-slim AS build
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm i --no-audit --no-fund

# Copy sources
COPY . .

# 🔑 Build args
ARG VITE_API_URL
ARG BUILD_ID

# Expose them à Vite (build-time)
ENV VITE_API_URL=${VITE_API_URL}
ENV BUILD_ID=${BUILD_ID}

# (debug) log les valeurs utilisées au build
RUN echo ">>> VITE_API_URL=$VITE_API_URL BUILD_ID=$BUILD_ID"

# Build
RUN npm run build

# --- Runtime stage ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# normaliser les fins de ligne au cas où (Windows)
RUN sed -i 's/\r$//' /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
