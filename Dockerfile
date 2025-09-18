# Build
FROM node:20-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Run
FROM node:20-bookworm AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app .
EXPOSE 3000
CMD ["npm","run","start"]
