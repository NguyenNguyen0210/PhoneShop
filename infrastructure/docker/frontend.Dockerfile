# Stage 1: Build React App
FROM node:22-alpine AS builder

WORKDIR /app

# Define build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source code and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine AS production

# Copy the build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a default nginx configuration for the React SPA (handles routing)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 internally
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
