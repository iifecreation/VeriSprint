# Production image for both the API (uvicorn) and the worker (arq) — the
# same image, two different CMDs, so there's one build/deploy artifact
# instead of two images drifting out of sync with each other's dependencies.
FROM python:3.11-slim AS base

# libpq for psycopg, build-essential for anything that needs to compile a
# wheel (bcrypt/pgvector historically have on some platforms) — removed
# after install to keep the runtime image lean.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml ./
RUN pip install --no-cache-dir --prefix=/install .

FROM base
COPY --from=builder /install /usr/local
COPY . .

# Runs as a non-root user — standard container hardening, no reason for
# this process to run as root.
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

EXPOSE 8000

# Default to the API server. Override CMD to
# `["arq", "app.queue.worker.WorkerSettings"]` for the worker process, and
# to `["alembic", "upgrade", "head"]` as a one-off release/migration task —
# same image, three roles.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
