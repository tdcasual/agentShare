FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv/agentShare

# 1) Dependency cache layer — pyproject.toml rarely changes
COPY apps/api/pyproject.toml apps/api/pyproject.toml
COPY apps/api/docker-entrypoint.sh apps/api/docker-entrypoint.sh
RUN mkdir -p apps/api/app \
    && python -m pip install --upgrade pip \
    && pip install --no-cache-dir ./apps/api \
    && chmod +x /srv/agentShare/apps/api/docker-entrypoint.sh

# 2) Application source — changes frequently, does NOT invalidate the dependency layer
COPY apps/api/app apps/api/app
COPY apps/api/alembic.ini apps/api/alembic.ini
COPY apps/api/alembic apps/api/alembic
RUN pip install --no-cache-dir --no-deps ./apps/api

EXPOSE 8000

ENTRYPOINT ["/srv/agentShare/apps/api/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
