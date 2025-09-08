# -------- Build --------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm config set fund false \
 && npm config set audit false \
 && npm config set progress false \
 && npm config set fetch-retries 5 \
 && npm config set fetch-timeout 600000 \
 && npm config set registry https://registry.npmjs.org/ \
 && --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps --no-optional

COPY . .
ARG VITE_API_URL=/api
ARG BUILD_ID=1
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=2048
RUN echo "BUILD_ID=${BUILD_ID}"
RUN npm run build

# -------- Runtime --------
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
