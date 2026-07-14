from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def _contract_text() -> str:
    paths = [
        ROOT / "README.md",
        *sorted((ROOT / "docs" / "guides").glob("*.md")),
        ROOT / "docker-compose.yml",
        ROOT / "docker-compose.prod.yml",
        ROOT / "ops" / "compose" / "prod.env.example",
    ]
    return "\n".join(path.read_text() for path in paths)


def test_documented_contract_contains_only_new_api_and_auth_configuration() -> None:
    text = _contract_text()

    for legacy in (
        "/api/bootstrap",
        "/api/session",
        "/api/secrets",
        "/api/tokens",
        "/api/audit-logs",
        "/api/me",
        "NEXT_PUBLIC_API_BASE_URL",
        "SESSION_SECRET",
        "fields=value",
    ):
        assert legacy not in text

    assert "/api/admin/agents" in text
    assert "/api/admin/management-tokens" in text
    assert "/api/vault/secrets" in text


def test_deleted_compatibility_sources_do_not_return() -> None:
    for relative_path in (
        "apps/api/app/dependencies.py",
        "apps/api/app/orm/token.py",
        "apps/api/app/orm/scope.py",
        "apps/control-plane-v3/src/lib/session-state.ts",
        "apps/control-plane-v3/src/lib/role-system.ts",
        "apps/control-plane-v3/src/store/role-store.ts",
        "apps/control-plane-v3/src/app/tokens/page.tsx",
    ):
        assert not (ROOT / relative_path).exists()
