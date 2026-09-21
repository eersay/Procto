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
# Vite reads this at build time
ARG VITE_API_URL
RUN npm run build     # outputs static files to /app/dist


# ── Production Stage (nginx serves the built React app) ──────
FROM nginx:alpine AS production
# The nginx image renders /etc/nginx/templates/*.template with the container's
# environment at startup, so the listen port follows $PORT (Railway sets it).
ENV PORT=80
COPY nginx.conf /etc/nginx/templates/default.conf.template
# Copy Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
