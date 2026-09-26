FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY scripts ./scripts
COPY src ./src
COPY public ./public
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
# Keep writable state outside the root-owned application directory. These paths
# match the existing Compose volume destinations and can be overridden by Render.
ENV NODE_ENV=production \
    DATABASE_PATH=/app/data/latfs.db \
    UPLOADS_PATH=/app/uploads
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY package*.json server.js ./
RUN install -d -o node -g node -m 0750 /app/data /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
