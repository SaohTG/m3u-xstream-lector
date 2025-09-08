FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY index.html ./
COPY tsconfig.json ./
COPY src ./src
EXPOSE 5173
CMD ["npm","run","dev","--","--host","0.0.0.0"]
