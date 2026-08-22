# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY backend/package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy source code and build
COPY backend/ ./
RUN npm run build

# Stage 2: Production environment
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy Prisma client and built application from builder stage
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist

# Set user to node for security
USER node

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/main.js"]
