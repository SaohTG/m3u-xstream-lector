# -------- Build --------
FROM node:20-alpine AS build
WORKDIR /app

# 1) Manifeste(s)
COPY package.json package-lock.json* ./

# 2) Config NPM et installation
RUN npm config set fund false \
 && npm config set audit false \
 && npm config set progress false \
 && npm config set fetch-retries 5 \
 && npm config set fetch-timeout 600000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm install --legacy-peer-deps --no-optional

# 3) Installer explicitement les outils de build (même si absents)
RUN npm install -D vite@5.2.8 @vitejs/plugin-react@4.2.1 typescript@5.4.5

# 4) Copier le code
COPY . .

# 5) Sanity checks (échoue tôt si fichiers manquent)
RUN test -f index.html || (echo "❌ index.html manquant" && exit 1)
RUN test -f src/main.tsx || (echo "❌ src/main.tsx manquant" && exit 1)
RUN test -f src/App.tsx   || (echo "❌ src/App.tsx manquant" && exit 1)

# 6) Variables Vite + build
ARG VITE_API_URL=/api
ARG BUILD_ID=1
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=2048

# Affiche versions + build; si échec, lance un build Vite en --debug pour plus de logs
RUN node -v && npm -v && npx vite --version || true \
 && (npm run build || (echo "----- VITE --debug -----" && npx vite build --debug; exit 1))

# -------- Runtime --------
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
