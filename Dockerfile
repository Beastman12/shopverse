# ShopVerse — production image
# Works on Fly.io, Railway, Koyeb, Cloud Run or any Docker host.
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Seed on first boot (idempotent), then start the server.
CMD ["sh", "-c", "node db/seed.js && node server.js"]
