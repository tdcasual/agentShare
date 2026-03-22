FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv/agentShare

COPY apps/api /srv/agentShare/apps/api

RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir ./apps/api

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
