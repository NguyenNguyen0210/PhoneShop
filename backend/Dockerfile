# syntax=docker/dockerfile:1
# Build context: backend/ (docker build -t phoneshop-backend ./backend).
FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@11

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
# prisma.config.ts requires a URL; generating the client does not connect to it.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate \
    && npm run build

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS production
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json package-lock.json prisma.config.ts ./
COPY --chown=node:node prisma/schema.prisma ./prisma/schema.prisma
COPY --chown=node:node prisma/migrations ./prisma/migrations
COPY --chown=node:node scripts/preflight-production-migrations.cjs ./scripts/preflight-production-migrations.cjs
USER node
EXPOSE 3000
# Apply reviewed database migrations separately before rolling out the app.
CMD ["node", "dist/src/main.js"]
