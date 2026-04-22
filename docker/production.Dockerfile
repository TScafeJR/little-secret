# syntax=docker/dockerfile:1.6

# ────────────────────────────────────────────────────────────────────────────
# Stage 1 — build the Vite static bundle.
# Pinned to node:22-alpine to match the existing dev Dockerfile.
# ────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS web

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY index.html tsconfig*.json vite.config.ts ./
COPY public ./public
COPY src ./src

# VITE_BACKEND_URL intentionally unset — the prod client resolves it to the
# current page origin (see src/config.ts::resolveBackendUrl). Override via
# --build-arg only if you split frontend + backend onto different hosts.
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

RUN yarn build

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — build the Go server binary. Statically linked so the runtime
# stage can be a minimal distro without a libc dependency.
# ────────────────────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS server

RUN apk add --no-cache git

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal

ENV CGO_ENABLED=0 GOOS=linux GOARCH=amd64
RUN go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/srv

# ────────────────────────────────────────────────────────────────────────────
# Stage 3 — runtime. alpine gives us tzdata + ca-certificates + a shell for
# debugging, and is tiny. Non-root for good measure.
# ────────────────────────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=server /out/server /app/server
COPY --from=web /app/dist /app/dist

USER app
EXPOSE 8080

ENV PORT=8080 \
    STATIC_FILE_PATH=/app/dist

ENTRYPOINT ["/app/server"]
