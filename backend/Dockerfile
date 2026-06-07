# Dockerfile — Multi-stage build for the DocChat FastAPI backend.
# Stage 1 installs dependencies; stage 2 copies only what's needed for runtime.

FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies for packages that compile native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Copy application source
COPY main.py rag_pipeline.py ./
COPY sample_docs/ ./sample_docs/

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser

ENV PORT=8000

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
