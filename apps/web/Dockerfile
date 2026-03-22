FROM node:22-bookworm-slim AS deps

WORKDIR /srv/agentShare/apps/web

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder

WORKDIR /srv/agentShare/apps/web

COPY --from=deps /srv/agentShare/apps/web/node_modules ./node_modules
COPY apps/web ./

RUN npm run build

FROM node:22-bookworm-slim AS prod-deps

WORKDIR /srv/agentShare/apps/web

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /srv/agentShare/apps/web

COPY --from=prod-deps /srv/agentShare/apps/web/node_modules ./node_modules
COPY --from=builder /srv/agentShare/apps/web/.next ./.next
COPY apps/web/package.json ./package.json
COPY apps/web/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
