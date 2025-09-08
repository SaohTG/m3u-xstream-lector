FROM node:20-bookworm-slim
WORKDIR /app

# Outils pour compiler les modules natifs (bcrypt, etc.)
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Copie des manifests uniquement pour installer les deps en cache
COPY package*.json ./
COPY tsconfig.json ./

# Optionnel: éviter les erreurs de peer deps et verbosité
ENV npm_config_loglevel=warn
RUN npm config set fund false \
 && npm config set audit false \
 && npm config set legacy-peer-deps true

# Installe les deps (pas de --production, on a besoin de ts-node au runtime)
RUN npm install

# Copie du code
COPY src ./src

EXPOSE 3000
CMD ["npx","ts-node","src/main.ts"]
