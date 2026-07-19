# VaultGate Web Console

Next.js 16 management console for VaultGate. Provides the web UI for secret storage, token management, and audit log review.

## What This README Covers

- Frontend-specific architecture
- Local development commands
- Browser-to-backend API contract
- Verification checklist

For deployment, backend routes, and operations runbooks, use the root `README.md` plus `docs/guides/*`.

## Architecture

```text
Browser
└─ Next.js App Router (src/app/)
   ├─ domain hooks (src/domains/*)
   ├─ same-origin /api/* proxy route
   └─ FastAPI management API + vaultgate_session cookie
```

- Browser code calls the canonical `/api/admin/*` and `/api/vault/*` paths on the same origin.
- `src/app/api/[...path]/route.ts` proxies those requests to the backend and forwards headers plus cookies.
- `src/domains/*` uses SWR for session-aware reads and writes.
- `src/lib/generated-api.ts` is generated from FastAPI OpenAPI; `vaultgate-api.ts` reuses its core response DTOs.
- UI components live in `src/components/ui/` and are based on [shadcn/ui](https://ui.shadcn.com).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS 3.4 |
| Components | shadcn/ui |
| State / Data | SWR, custom domain hooks |
| Internationalization | Custom i18n provider |
| Testing | Vitest + React Testing Library + Playwright (E2E) |

## API Contract

- Browser code should call canonical paths such as `/api/admin/session` or `/api/admin/secrets`.
- The frontend proxy forwards `/api/*` paths to `VAULTGATE_API_URL`; upstream requests time out after `VAULTGATE_API_TIMEOUT_MS` milliseconds (code default 15000; the compose deployments set 30000, overridable through the environment variable).
- Management routes require a valid `vaultgate_session` cookie or `vgm_` management token.

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend against a local API:

```bash
VAULTGATE_API_URL=http://127.0.0.1:8000 npm run dev
```

## Verification

Frontend-only checks:

```bash
npm run check      # typecheck + lint + format:check
npm run check:api-types # regenerate OpenAPI types and fail on committed drift
npm test -- --run  # unit tests
npm run build      # production build
```

Canonical repository verification (from repository root):

```bash
./scripts/ops/verify-control-plane.sh
```

Run the destructive, isolated Compose integration flow (it creates and removes its own project and database volume):

```bash
./scripts/ops/run-synthetic-flow.sh
```

The API runtime also accepts `ENCRYPTION_ACTIVE_KEY_ID`, `ENCRYPTION_KEYRING`,
`MAX_REQUEST_BODY_BYTES`, and `IDEMPOTENCY_RETENTION_DAYS`; see the production
security and deployment guides for rotation and sizing rules.

## UI Conventions

- Use components from `@/components/ui` for all new UI.
- Prefer semantic Tailwind tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`) over raw colors.
- Keep components accessible: associate labels with inputs, use `aria-live` for status, and respect `prefers-reduced-motion`.
