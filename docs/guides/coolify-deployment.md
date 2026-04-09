# Coolify Deployment

## Purpose

This guide is the public production path for teams that still want a simple single-stack deployment on Coolify. It keeps `openbao`, `postgres`, `redis`, `api`, and `web` in one compose stack, but defaults the app to production-safe runtime settings and only leaves a small set of sensitive values for operators to fill in.

## What You Trade For Simplicity

- Coolify handles public ingress and TLS instead of the in-repo Caddy service.
- `openbao` stays inside the same stack, but now uses persistent integrated storage plus an on-container bootstrap flow instead of the old dev mode.
- The API container runs `alembic upgrade head` on startup before `uvicorn`, so schema changes are applied automatically for this path.

This is a good fit when you want public production access with minimal moving parts. If you still want the stricter repository-owned ingress and external secret-backend split, stay on `docker-compose.prod.yml`.

## Required Inputs

`docker-compose.coolify.yml` keeps defaults for the non-sensitive wiring, but public production still needs a few real values.

Use `ops/compose/coolify.env.example` as the starting point. The minimum values you should replace are:

- `PUBLIC_HOST`
- `POSTGRES_PASSWORD`
- `BOOTSTRAP_OWNER_KEY`
- `MANAGEMENT_SESSION_SECRET`

Optional but commonly needed:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEEPSEEK_API_KEY`
- `GOOGLE_API_KEY`

Keep `OPENBAO_ADDR=http://openbao:8200` and `OPENBAO_TOKEN_FILE=/openbao/bootstrap/root-token` so the API talks to the same-stack OpenBao instance over the private compose network and reads the generated root token from the shared bootstrap volume.

## Deploy In Coolify

1. Create a new Docker Compose application in Coolify from this repository.
2. Select `docker-compose.coolify.yml` as the compose file.
3. Paste the contents of `ops/compose/coolify.env.example` into the shared environment section.
4. Attach a public domain to the `web` service using `APP_BASE_URL`.
5. Optionally attach a public domain to the `api` service if you want public `/docs` or direct API access.
6. Deploy the stack.

The API container will run `alembic upgrade head` automatically during startup, so you do not need a separate migration job for this deployment path. The OpenBao container initializes itself on first boot, persists its storage and seal state in Docker volumes, and writes the generated root token into the shared bootstrap volume that the API mounts read-only.

## Deploy With Plain Docker Compose

```bash
cp ops/compose/coolify.env.example .env.coolify
docker compose --env-file .env.coolify -f docker-compose.coolify.yml up -d --build
```

Then visit:

- `APP_BASE_URL` for the control plane
- `NEXT_PUBLIC_API_BASE_URL/docs` for the FastAPI docs if you exposed the API publicly

## Notes

- Coolify is responsible for ingress and TLS on this path.
- `postgres`, `redis`, and `openbao` are persisted with Docker volumes in the compose stack.
- This is still a convenience-oriented single-host deployment, not a clustered secret-management platform.
- `OPENAI_API_KEY` and the other LLM passthrough variables are provided for public production compatibility with agent runtimes and overlays that expect them in the container environment. They do not replace the repository's managed secret inventory APIs.
