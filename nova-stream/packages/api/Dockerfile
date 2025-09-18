# ---- Base ----
FROM node:18-alpine AS base
WORKDIR /usr/src/app
RUN npm install -g pnpm

# ---- Dependencies ----
FROM base AS deps
# Copy only package files to leverage Docker cache
COPY package.json pnpm-lock.yaml* ./
# Copy workspace config to ensure monorepo dependencies are resolved
COPY ../../pnpm-workspace.yaml ./
# Copy shared package definition
COPY ../shared/package.json ./packages/shared/
# Install all dependencies for the entire monorepo, then prune for the api package
RUN pnpm install --frozen-lockfile
RUN pnpm -r exec -- rm -rf node_modules && pnpm install --prod

# ---- Build ----
FROM base AS builder
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# Build shared package first (if it had a build step)
# RUN pnpm --filter @novastream/shared build
RUN pnpm --filter api build

# ---- Production ----
FROM node:18-alpine AS production
ENV NODE_ENV production
WORKDIR /usr/src/app

# Copy production dependencies
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy built application
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/main"]
