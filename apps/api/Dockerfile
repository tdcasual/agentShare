# ============================================================
# Stage 1: Builder — install dependencies
# ============================================================
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies
COPY apps/api/pyproject.toml apps/api/requirements.lock ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.lock

# ============================================================
# Stage 2: Runner — minimal production image
# ============================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/srv/vaultgate/apps/api

WORKDIR /srv/vaultgate

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY apps/api/pyproject.toml apps/api/pyproject.toml
COPY apps/api/app apps/api/app
COPY apps/api/alembic.ini apps/api/alembic.ini
COPY apps/api/alembic apps/api/alembic
COPY apps/api/docker-entrypoint.sh apps/api/docker-entrypoint.sh

RUN chmod +x /srv/vaultgate/apps/api/docker-entrypoint.sh

# Create non-root user
RUN adduser --disabled-password --gecos "" --home /home/appuser appuser \
    && mkdir -p /srv/vaultgate/apps/api/app \
    && chown -R appuser:appuser /srv/vaultgate/apps/api/app \
    && chmod -R o-w /srv/vaultgate

EXPOSE 8000

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')" || exit 1

ENTRYPOINT ["/srv/vaultgate/apps/api/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
