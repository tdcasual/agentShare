# VaultGate Web Console

Next.js 15 management console for VaultGate. Provides the web UI for secret storage, token management, and audit log review.

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
   └─ FastAPI management API + management_session cookie
```

- Browser code calls logical backend paths without an `/api` prefix.
- `src/app/api/[...path]/route.ts` proxies those requests to the backend and forwards headers plus cookies.
- `src/domains/*` uses SWR for session-aware reads and writes.
- UI components live in `src/components/ui/` and are based on [shadcn/ui](https://ui.shadcn.com).

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS 3.4 |
| Components | shadcn/ui |
| State / Data | SWR, custom domain hooks |
| Internationalization | Custom i18n provider |
| Testing | Vitest + React Testing Library + Playwright (E2E) |

## API Contract

- Browser code should call logical paths such as `/session/me` or `/secrets`.
- The frontend proxy normalizes `VAULTGATE_API_URL` and falls back to the same-origin default.
- Management routes require a valid `management_session` cookie.

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
npm test -- --run  # unit tests
npm run build      # production build
```

Canonical repository verification (from repository root):

```bash
./scripts/ops/verify-control-plane.sh
```

## UI Conventions

- Use components from `@/components/ui` for all new UI.
- Prefer semantic Tailwind tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`) over raw colors.
- Keep components accessible: associate labels with inputs, use `aria-live` for status, and respect `prefers-reduced-motion`.
