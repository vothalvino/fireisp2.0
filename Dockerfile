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
# Install docker CLI for executing certbot commands in frontend container
RUN apk add --no-cache docker-cli
RUN mkdir -p /app/uploads /app/ssl
EXPOSE 3000
CMD ["node", "server.js"]

# Frontend build stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
# Install dependencies with explicit flags to avoid hanging
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY frontend/ ./
# Build frontend
RUN npm run build

# Frontend nginx stage
FROM nginx:alpine AS frontend
# Install openssl for SSL certificate generation and certbot for Let's Encrypt
RUN apk add --no-cache openssl certbot certbot-nginx
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Create directory for SSL certificates and make entrypoint executable
RUN mkdir -p /etc/nginx/ssl && \
    chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
