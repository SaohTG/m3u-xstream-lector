# -------- Build --------
FROM node:20-alpine AS build
WORKDIR /app

# 1) Manifeste(s)
COPY package.json package-lock.json* ./

# 2) Afficher les scripts pour vérifier que "build" existe
RUN echo "==== package.json ====" && cat package.json && echo "======================"

# 3) Config NPM + install
RUN npm config set fund false \
 && npm config set audit false \
 && npm config set progress false \
 && npm config set fetch-retries 5 \
 && npm config set fetch-timeout 600000 \
 && npm config set registry https://registry.npmjs.org/ \
 && npm install --legacy-peer-deps --no-optional

# 4) Installer Vite/React/TS au cas où ils ne sont pas dans le lock
RUN npm i -D vite@5.2.8 @vitejs/plugin-react@4.2.1 typescript@5.4.5

# 5) Copier le code
COPY . .

# 6) Sanity checks (fail tôt si fichiers manquent)
RUN test -f index.html || (echo "❌ index.html manquant" && exit 1)
RUN test -f src/main.tsx || (echo "❌ src/main.tsx manquant" && exit 1)
RUN test -f src/App.tsx   || (echo "❌ src/App.tsx manquant" && exit 1)

# 7) Afficher versions & contenu src
RUN echo "node: $(node -v) • npm: $(npm -v)" \
 && npx vite --version || true \
 && echo "==== ls -la /app ====" && ls -la \
 && echo "==== ls -la /app/src ====" && ls -la src

# 8) Build; si échec, montrer la cause lisible
ARG VITE_API_URL=/api
ARG BUILD_ID=1
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=2048
RUN echo "BUILD_ID=${BUILD_ID}"
RUN npm run build || (echo "----- npm run build a échoué: scripts build manquant / erreur Vite/TS ci-dessus -----"; exit 1)

# -------- Runtime --------
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
