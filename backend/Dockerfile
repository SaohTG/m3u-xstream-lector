FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm i
COPY tsconfig.json ./
COPY src ./src
ENV API_PORT=4000
EXPOSE 4000
CMD ["npm","run","start:dev"]
