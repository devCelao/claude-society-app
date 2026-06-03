# Dockerfile — claude-society-app (Next.js standalone)
# Requer: output: 'standalone' em next.config.ts

# ---------------------------------------------------------------------------
# Stage 1: deps — instala dependencias de producao
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ---------------------------------------------------------------------------
# Stage 2: builder — compila o Next.js com todas as dependencias
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---------------------------------------------------------------------------
# Stage 3: migrator — aplica prisma migrate deploy em producao
# ---------------------------------------------------------------------------
FROM node:20-alpine AS migrator
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# Stage 4: runtime — imagem final minima com standalone output
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copia o output standalone (inclui server.js + node_modules minimos)
COPY --from=builder /app/.next/standalone ./
# Copia os assets estaticos gerados
COPY --from=builder /app/.next/static ./.next/static
# Copia a pasta public (imagens, fontes, etc.)
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
