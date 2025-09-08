# -------- Build --------
FROM node:20-alpine AS build
WORKDIR /app

# Manifeste(s)
COPY package.json package-lock.json* ./

# NPM réglé pour logs verbeux (afin de VOIR l’erreur réelle)
RUN npm config set fund false \
 && npm config set audit false \
 && npm config set progress false \
 && npm config set loglevel verbose \
 && npm config set fetch-retries 5 \
 && npm config set fetch-timeout 600000 \
 && npm config set registry https://registry.npmjs.org/

# Install (sans npm ci pour éviter les plantages de lock), cache npm activé
RUN --mount=type=cache,target=/root/.npm npm install --legacy-peer-deps --no-optional

# Code
COPY . .

# Sanity checks (font échouer TÔT avec message clair si un fichier manque)
RUN test -f index.html || (echo "❌ index.html manquant à /app/index.html" && exit 1)
RUN test -f src/main.tsx || (echo "❌ src/main.tsx manquant" && exit 1)
RUN test -f src/App.tsx   || (echo "❌ src/App.tsx manquant" && exit 1)

# Variables Vite
ARG VITE_API_URL=/api
ARG BUILD_ID=1
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_OPTIONS=--max_old_space_size=2048

# Affiche l’arbo + versions, puis build. En cas d'erreur, on relance vite en --debug pour log complet.
RUN echo "📦 Contenu /app :" && ls -la \
 && echo "📂 Contenu /app/src :" && ls -la src || true \
 && node -v && npm -v \
 && npx vite --version || true \
 && (npm run build || (echo "----- VITE --debug -----" && npx vite build --debug; exit 1))

# -------- Runtime --------
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
