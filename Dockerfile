# Multi-stage build for backend and frontend

# Backend stage
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production
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
# Enable corepack to use yarn
RUN corepack enable
COPY frontend/package*.json ./
# Generate yarn.lock from package-lock.json and install with yarn
RUN yarn import || true
RUN yarn install --frozen-lockfile || yarn install
COPY frontend/ ./
RUN yarn build

# Frontend nginx stage
FROM nginx:alpine AS frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
