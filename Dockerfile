# syntax=docker/dockerfile:1
FROM rust:1.80-slim as builder

WORKDIR /usr/src/aimux
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
RUN cargo build --release -p aimux-cli

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    ca-certificates \
    git \
    openssh-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/aimux/target/release/aimux /usr/local/bin/aimux

LABEL org.opencontainers.image.source="https://github.com/Vs153698/aimux"
LABEL org.opencontainers.image.description="AIMux - Universal Multi-Account Isolation & Autonomous Handoff Manager for Claude Code & Antigravity"
LABEL org.opencontainers.image.licenses="Apache-2.0"

ENV HOME=/root
WORKDIR /root

ENTRYPOINT ["aimux"]
CMD ["--help"]
