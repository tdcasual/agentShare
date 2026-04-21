# Control Plane V3

Next.js 15 web surface for the AgentShare control plane. This package is the frontend for the repository's agent-server-first stack and should be read together with the root `README.md`.

## What This README Covers

- frontend-specific architecture
- local development commands
- browser-to-backend API contract
- current release posture for the web layer

For deployment, backend routes, and operations runbooks, use the root `README.md` plus `docs/guides/*`.

## Current Product Shape

- Management routes use persisted backend data through same-origin `/api/*`.
- Demo and runtime-oriented routes still use a browser-side runtime and plugin model.
- The current visual direction intentionally keeps a `kawaii` and soft-operational tone. Treat that as a product requirement, not accidental design drift.

## Dual-Track Frontend Architecture

```text
Browser
├─ Management shell
│  ├─ domain APIs + SWR hooks
│  ├─ same-origin /api/*
│  ├─ Next.js proxy route
│  └─ FastAPI management API + management_session cookie
└─ Demo/runtime shell
   ├─ RuntimeProvider
   ├─ createCoreRuntime() + initializeRuntime()
   ├─ IdentityDomainPlugin and local registry services
   └─ in-browser state, event bus, and theme/i18n runtime
```

### Management track

- Browser code calls business paths without an `/api` prefix.
- `src/app/api/[...path]/route.ts` proxies those requests to the backend and forwards headers plus cookies.
- `src/domains/*/hooks.ts` uses SWR for session-aware reads and writes.
- `src/lib/control-plane-links.ts` is the shared navigation schema for mobile, tablet, and desktop shells.

### Runtime/demo track

- `src/components/runtime-provider.tsx` creates the browser runtime and installs domain plugins.
- `src/core/runtime.ts` provides the local plugin registry, event bus, DI container, state container, theme engine, and i18n engine.
- `src/hooks/use-shell-identity.ts` switches between session-backed management identity and runtime-backed demo identity based on the current route.

## API Contract

- Browser code should call logical paths such as `/session/me` or `/openclaw/agents`.
- The frontend proxy normalizes `BACKEND_API_URL` and `AGENT_CONTROL_PLANE_API_URL`.
- Both `http://localhost:8000` and `http://localhost:8000/api` are valid backend base URLs.
- The final backend target must contain exactly one `/api` prefix.

More endpoint detail lives in `docs/api-endpoints.md`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend against a local API:

```bash
BACKEND_API_URL=http://127.0.0.1:8000 npm run dev
```

Equivalent fallback env:

```bash
AGENT_CONTROL_PLANE_API_URL=http://127.0.0.1:8000 npm run dev
```

If you want the full local demo stack with seeded backend data, run this from the repository root:

```bash
./scripts/ops/start-control-plane-demo.sh
```

## Verification

Frontend-only checks:

```bash
npm run check
npm test -- --run
npm run build
```

Canonical repository verification:

```bash
./scripts/ops/verify-control-plane.sh
```

## Current Release Posture

- The frontend is suitable for internal demos, operator dogfooding, and supervised trial-run deployments with the current backend and runbooks.
- It is not the sole architecture authority for deployment or enterprise readiness; the repository root posture still applies.
- The recent convergence pass focused on calmer visual hierarchy, shared primitive cleanup, centralized shell navigation, and safer system-state presentation without changing routing or backend contracts.

## Key References

- `src/app/api/[...path]/route.ts`
- `src/components/runtime-provider.tsx`
- `src/core/runtime.ts`
- `src/hooks/use-shell-identity.ts`
- `src/lib/control-plane-links.ts`
- `docs/api-endpoints.md`
- `../../docs/plans/2026-04-21-frontend-convergence-kimi-plan.md`
