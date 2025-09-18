# ---------- Build stage ----------
FROM node:20-bookworm AS build
WORKDIR /app

# Copier manifestes et installer SANS scripts (évite les postinstall)
COPY package.json ./
# si tu as un package-lock.json commité, décommente la ligne suivante :
# COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund --ignore-scripts

# Copier le reste du code
COPY . .

# Générer Prisma + builder Next
RUN npx prisma generate && npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm","run","start"]
