# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY clash-meta/frontend/package.json clash-meta/frontend/package-lock.json ./
RUN npm ci
COPY clash-meta/frontend/ ./
RUN npm run build

# Stage 2: Build Rust backend
FROM rust:1.85-slim AS backend
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY clash-meta/Cargo.toml clash-meta/Cargo.lock ./
COPY clash-meta/src/ ./src/
RUN cargo build --release

# Stage 3: Runtime
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/target/release/clash-meta ./
COPY --from=frontend /app/frontend/dist ./frontend/dist/
EXPOSE 3000
CMD ["./clash-meta"]
