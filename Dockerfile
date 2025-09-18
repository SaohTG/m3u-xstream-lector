# Build
FROM node:20-bookworm AS build
WORKDIR /app

# Copie uniquement package.json pour installer les deps
COPY package.json ./
RUN npm install --no-audit --no-fund

# Puis copie le reste et build
COPY . .
RUN npm run build

# Run
FROM node:20-bookworm AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm","run","start"]
