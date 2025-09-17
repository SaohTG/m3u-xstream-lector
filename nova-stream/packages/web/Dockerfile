# ---- Base ----
FROM node:18-alpine AS base
WORKDIR /usr/src/app
RUN npm install -g pnpm

# ---- Dependencies ----
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY ../../pnpm-workspace.yaml ./
# Copy shared package definition
COPY ../shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM base AS builder
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Production ----
FROM node:18-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV production
# The NEXT_PUBLIC_API_BASE_URL must be available at runtime
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

COPY --from=builder /usr/src/app/public ./public
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static

# The default Next.js user
USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
