FROM node:22-bookworm-slim AS deps

WORKDIR /srv/agentShare/apps/control-plane-v3

COPY apps/control-plane-v3/package.json apps/control-plane-v3/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder

WORKDIR /srv/agentShare/apps/control-plane-v3

COPY --from=deps /srv/agentShare/apps/control-plane-v3/node_modules ./node_modules
COPY apps/control-plane-v3 ./

RUN npm run build

FROM node:22-bookworm-slim AS prod-deps

WORKDIR /srv/agentShare/apps/control-plane-v3

COPY apps/control-plane-v3/package.json apps/control-plane-v3/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /srv/agentShare/apps/control-plane-v3

COPY --from=prod-deps /srv/agentShare/apps/control-plane-v3/node_modules ./node_modules
COPY --from=builder /srv/agentShare/apps/control-plane-v3/.next ./.next
COPY apps/control-plane-v3/package.json ./package.json
COPY apps/control-plane-v3/next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
