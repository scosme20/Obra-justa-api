# ── Build stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# firebase-auth.json deve ser montado via secret no Render
# Não inclua o arquivo no build — configure via Render Secret Files

EXPOSE 3000

CMD ["node", "dist/main"]