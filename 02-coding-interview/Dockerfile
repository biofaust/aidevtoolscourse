FROM node:22-bookworm AS builder

WORKDIR /app

# Root dependencies (concurrently for local dev; optional in runtime)
COPY package*.json ./
RUN npm install

# Backend dependencies
COPY backend/package*.json backend/
RUN cd backend && npm install --omit=dev

# Frontend dependencies (needs dev deps to build)
COPY frontend/package*.json frontend/
RUN cd frontend && npm install

# Copy source
COPY backend backend
COPY frontend frontend

# Build frontend assets
RUN cd frontend && npm run build

# Final stage
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Copy backend runtime deps
COPY --from=builder /app/backend/node_modules backend/node_modules
# Copy backend source
COPY --from=builder /app/backend backend
# Copy built frontend dist
COPY --from=builder /app/frontend/dist frontend/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV CLIENT_ORIGIN=http://localhost:3001

EXPOSE 3001

CMD ["node", "backend/src/server.js"]
