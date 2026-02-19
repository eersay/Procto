# ============================================================
#  PROCTO Frontend — Dockerfile
#  Multi-stage: 'development' (Vite HMR) + 'production' (nginx)
# ============================================================

# ── Development Stage ────────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
# Source is volume-mounted in docker-compose, so no COPY . here
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ── Builder Stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite reads these at build time
ARG VITE_API_URL
ARG VITE_WS_URL
RUN npm run build     # outputs static files to /app/dist


# ── Production Stage (nginx serves the built React app) ──────
FROM nginx:alpine AS production
# Copy custom nginx config (handles SPA routing — all paths → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
