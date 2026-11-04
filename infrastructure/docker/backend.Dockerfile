# ============================================================
# Stage 1: builder
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
# (pin npm 11: package-lock was generated with npm 11, npm 10's `ci` mis-resolves it)
COPY backend/package*.json ./
RUN npm install -g npm@11 && npm ci

# Copy Prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy all backend source and compile
COPY backend/ ./
RUN npm run build

# ============================================================
# Stage 2: runner
# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies only
COPY backend/package*.json ./
RUN npm install -g npm@11 && npm ci --omit=dev

# Copy generated Prisma client and compiled dist from builder
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

# Bundle Prisma schema + migrations for the separate one-shot migration service.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY backend/scripts/preflight-production-migrations.cjs ./scripts/preflight-production-migrations.cjs

# Expose backend service port
EXPOSE 3000

# Run container as non-root user
USER node

# Migrations are run separately after a verified backup, before app rollout.
CMD ["node", "dist/src/main.js"]
