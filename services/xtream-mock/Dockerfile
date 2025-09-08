FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# on exécute l'API via ts-node (pas besoin de build nest)
CMD ["npx","ts-node","src/main.ts"]
