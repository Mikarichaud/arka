FROM node:22-alpine

WORKDIR /app

# Install deps en première couche pour profiter du cache Docker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY server.js ./

ENV NODE_ENV=production
EXPOSE 5003

CMD ["node", "server.js"]
