# ============================================================
#  PROCTO Backend — Dockerfile
#  Multi-stage: 'development' (hot reload) + 'production' (optimized)
# ============================================================

# ── Base ─────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
# Install only OS deps needed (for bcrypt native bindings, Prisma, etc.)
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
COPY prisma ./prisma/


# ── Development Stage ────────────────────────────────────────
FROM base AS development
# Install ALL deps (including devDependencies for ts-node-dev)
RUN npm install
# Generate Prisma client
RUN npx prisma generate
# Copy source — but volume mount will override this in docker-compose
COPY . .
EXPOSE 4000 4001
# ts-node-dev: recompiles + restarts on file change
CMD ["npm", "run", "dev"]


# ── Builder Stage (compile TypeScript → JavaScript) ──────────
FROM base AS builder
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build     # outputs to /app/dist


# ── Production Stage ─────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
# Only production dependencies
COPY package*.json ./
RUN npm ci --only=production
# Copy Prisma client and compiled code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma
# Run as non-root user for security
RUN addgroup -S procto && adduser -S procto -G procto
USER procto
EXPOSE 4000 4001
CMD ["node", "dist/server.js"]
