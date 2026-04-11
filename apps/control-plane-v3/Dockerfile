FROM node:22-bookworm-slim AS deps

WORKDIR /srv/agentShare/apps/control-plane-v3

COPY apps/control-plane-v3/package.json apps/control-plane-v3/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder

WORKDIR /srv/agentShare/apps/control-plane-v3

COPY --from=deps /srv/agentShare/apps/control-plane-v3/node_modules ./node_modules
COPY apps/control-plane-v3 ./

RUN npm run build

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /srv/agentShare/apps/control-plane-v3

# Standalone output contains the minimal server and node_modules
COPY --from=builder /srv/agentShare/apps/control-plane-v3/.next/standalone ./
# Static assets must be copied separately
COPY --from=builder /srv/agentShare/apps/control-plane-v3/.next/static ./.next/static
# Public assets (PWA icons, manifest, service worker)
COPY --from=builder /srv/agentShare/apps/control-plane-v3/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
