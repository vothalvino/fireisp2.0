# Multi-stage build for backend and frontend

# Backend stage
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./

FROM node:20-alpine AS backend
WORKDIR /app
COPY --from=backend-builder /app ./
RUN mkdir -p /app/uploads /app/ssl
EXPOSE 3000
CMD ["node", "server.js"]

# Frontend build stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
# Try npm ci first, fallback to npm install if lockfile doesn't work
RUN npm ci || npm install
COPY frontend/ ./
# Build frontend - if dist already exists from local build, this will rebuild it
RUN npm run build

# Frontend nginx stage
FROM nginx:alpine AS frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
# Create directory for SSL certificates
RUN mkdir -p /etc/nginx/ssl && \
    # Generate self-signed certificate as placeholder if none provided
    # This prevents nginx from failing to start when SSL config is present but certs are missing
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" 2>/dev/null || true
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
