# Contributing

## Development

Bootstrap the locked toolchain with `./scripts/ops/bootstrap-dev-runtime.sh`, then run
`./scripts/ops/verify-control-plane.sh` before submitting a change. Keep database changes in Alembic
migrations and preserve existing data during upgrades.

## Pull Requests

Keep changes focused, add regression tests for behavior changes, and update deployment documentation
when configuration changes. Never commit real credentials, generated environment files, database
backups, or production data. Security-sensitive changes require review from the code owner.

The architecture intentionally separates `/api/admin/*` from `/api/vault/*`: administrators use a
session or `vgm_` management Token, while Agents use `vg_` Tokens with explicit per-Secret grants.
Do not add implicit tag-based access or legacy compatibility routes.
