FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS deps

WORKDIR /srv/vaultgate/apps/control-plane-v3

COPY apps/control-plane-v3/package.json apps/control-plane-v3/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS builder

WORKDIR /srv/vaultgate/apps/control-plane-v3

COPY --from=deps /srv/vaultgate/apps/control-plane-v3/node_modules ./node_modules
COPY apps/control-plane-v3 ./

RUN npm run build

FROM node:22-bookworm-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS runner

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /srv/vaultgate/apps/control-plane-v3

# Standalone output contains the minimal server and node_modules
COPY --from=builder /srv/vaultgate/apps/control-plane-v3/.next/standalone ./
# Static assets must be copied separately
COPY --from=builder /srv/vaultgate/apps/control-plane-v3/.next/static ./.next/static
# Public assets (PWA icons, manifest, service worker)
COPY --from=builder /srv/vaultgate/apps/control-plane-v3/public ./public

RUN rm -rf \
      /usr/local/lib/node_modules/npm \
      /usr/local/lib/node_modules/corepack \
      /opt/yarn-v1.22.22 \
    && rm -f \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/corepack \
      /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
