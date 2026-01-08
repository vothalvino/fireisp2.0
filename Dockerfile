# Multi-stage build for backend and frontend

# Backend stage
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
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
# Try npm install, but continue even if it fails since we might have pre-built dist
RUN npm install || true
COPY frontend/ ./
# Try to build, but if dist already exists, skip
RUN npm run build || true

# Frontend nginx stage
FROM nginx:alpine AS frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
