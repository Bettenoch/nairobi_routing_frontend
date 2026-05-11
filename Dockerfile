# ─────────────────────────────────────────────────────────────────────────────
# Smart Nairobi Delivery Routing — Backend Dockerfile
# Multi-stage build: builder installs deps, runtime is lean
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

# System deps needed to compile geopandas / fiona / pyproj / osmnx
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    libspatialindex-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy dependency file first for layer caching
COPY pyproject.toml .

# Install pip + wheel then all project dependencies
# We use pip (not uv) inside Docker for maximum compatibility
RUN pip install --upgrade pip wheel

# Extract and install runtime dependencies from pyproject.toml
# We pin them exactly as declared — deterministic builds
RUN pip install --no-cache-dir \
    "fastapi==0.111.0" \
    "uvicorn[standard]==0.30.1" \
    "websockets==12.0" \
    "python-multipart==0.0.9" \
    "osmnx==1.9.3" \
    "networkx==3.3" \
    "geopandas==0.14.4" \
    "shapely==2.0.4" \
    "pyproj==3.6.1" \
    "fiona==1.9.6" \
    "scikit-learn==1.5.0" \
    "scipy==1.13.0" \
    "numpy==1.26.4" \
    "pandas==2.2.2" \
    "httpx==0.27.0" \
    "ortools==9.10.4067" \
    "pydantic==2.7.1" \
    "pydantic-settings==2.3.1" \
    "python-dotenv==1.0.1" \
    "redis==5.0.4" \
    "hiredis==2.3.2" \
    "loguru==0.7.2" \
    "ujson==5.10.0" \
    "python-jose==3.3.0" \
    "anyio==4.4.0" \
    "hdbscan"

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Runtime system libraries (shared objects needed by geopandas / pyproj)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal32 \
    libgeos-c1v5 \
    libproj25 \
    libspatialindex6 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser scripts/ ./scripts/
COPY --chown=appuser:appuser .env.example ./.env.example

# Create cache directory (OSMnx graph pickle lives here)
RUN mkdir -p /app/cache && chown appuser:appuser /app/cache

# Switch to non-root
USER appuser

# Expose FastAPI port
EXPOSE 8000

# Health check — polls the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Default command — production-grade uvicorn settings
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--loop", "uvloop", \
     "--log-level", "info", \
     "--no-access-log"]