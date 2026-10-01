FROM node:24-alpine

WORKDIR /app
COPY package.json ./
COPY public ./public
COPY server ./server

ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/app/data/my-jersey.sqlite

RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "server/server.js"]
