# ==========================================
# 1. Build Frontend (React + Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# 2. Build Backend (Go)
# ==========================================
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# ==========================================
# 3. Production Runner
# ==========================================
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy built frontend assets and backend binary
COPY --from=frontend-builder /app/frontend/dist ./dist
COPY --from=backend-builder /app/server ./server

# Create non-root user (UID 1000) for Hugging Face Spaces compatibility
RUN adduser -u 1000 -D -h /app appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app

USER appuser

# Environment variables
ENV PORT=7860
ENV DB_TYPE=sqlite
ENV DB_FILE=/app/data/daily_tracker.db
ENV GIN_MODE=release

EXPOSE 7860

CMD ["./server"]
