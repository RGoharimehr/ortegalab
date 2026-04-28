# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine
LABEL org.opencontainers.image.title="LATFS Website"
LABEL org.opencontainers.image.description="Laboratory for Advanced Thermal and Fluid Systems — Villanova University"

WORKDIR /app

# Copy production dependencies from build stage
COPY --from=build /app/node_modules ./node_modules

# Copy source files (excluding uploads, db, and secrets)
COPY server.js ./
COPY public ./public/

# Create directories that must persist across restarts (mount as volumes)
RUN mkdir -p uploads

# Run as a non-root user for security
RUN addgroup -S latfs && adduser -S latfs -G latfs && \
    chown -R latfs:latfs /app
USER latfs

EXPOSE 3000
ENV NODE_ENV=production

# Health check: ping the server every 30 s
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
