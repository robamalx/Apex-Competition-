# ------------------------------------------------------------------------------
# APEX ARENA — PRODUCTION CONTAINER IMAGE (Multi-Stage Distroless/Alpine)
# ------------------------------------------------------------------------------

# Stage 1: Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Copy application source code (excluding secrets via .dockerignore)
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src/ ./src/
COPY public/ ./public/
COPY server.ts ./

# Compile frontend SPA and backend CommonJS bundle (dist/server.cjs)
ENV NODE_ENV=production
RUN npm run build

# Prune dev dependencies for lean production footprint
RUN npm prune --production

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Stage
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Security: Run as non-root user (node:node, uid/gid 1000)
ENV NODE_ENV=production
ENV PORT=3000

# Create application directories and establish safe ownership
RUN mkdir -p /app/data /app/data/backups /app/data/audit /app/dist \
    && chown -R node:node /app

# Copy production dependencies and compiled artifacts only
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy migrations and seed data needed by DatabaseMigrator at runtime
COPY --chown=node:node src/server/db/migrations/ ./src/server/db/migrations/
COPY --chown=node:node data/ ./data/

# Writable directories permission verification
RUN chown -R node:node /app/data

# Switch to non-root execution user
USER node

# Expose standard production port
EXPOSE 3000

# Health check instruction
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Production startup command
CMD ["node", "dist/server.cjs"]
