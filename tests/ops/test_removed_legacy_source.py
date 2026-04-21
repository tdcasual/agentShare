import re
from pathlib import Path


def _term(*parts: str) -> str:
    return "".join(parts)


# Each pattern uses word-boundary or context-specific matching to avoid
# false positives from substrings (e.g. "AgentRepository" inside "OpenClawAgentRepository").
FORBIDDEN_PATTERNS: list[tuple[str, re.Pattern]] = [
    (_term("Agent", "Token"), re.compile(rf"\b{_term('Agent', 'Token')}\b")),
    (_term("agent", "_", "tokens"), re.compile(rf"\b{_term('agent', '_', 'tokens')}\b")),
    (_term("Agent", "Identity", "Model"), re.compile(rf"\b{_term('Agent', 'Identity', 'Model')}\b")),
    (_term("legacy", "_", "name"), re.compile(rf"\b{_term('legacy', '_', 'name')}\b")),
    (
        _term("LEGACY", "_", "TOOL", "_", "ALIASES"),
        re.compile(rf"\b{_term('LEGACY', '_', 'TOOL', '_', 'ALIASES')}\b"),
    ),
    (
        _term("target", "_", "token", "_", "ids"),
        re.compile(rf"\b{_term('target', '_', 'token', '_', 'ids')}\b"),
    ),
    (
        _term("target", "_", "token", "_", "id"),
        re.compile(rf"\b{_term('target', '_', 'token', '_', 'id')}\b"),
    ),
    (_term("/", "api", "/", "agents", "/"), re.compile(rf"{_term('/', 'api', '/', 'agents', '/')}")),
    (
        _term("/", "api", "/", "agent", "-", "tokens"),
        re.compile(rf"{_term('/', 'api', '/', 'agent', '-', 'tokens')}"),
    ),
]

EXCLUDED_SUFFIXES = {".py", ".ts", ".tsx", ".json"}


def test_source_no_longer_contains_removed_legacy_agent_token_terms():
    offenders: list[tuple[str, str]] = []

    for root in [Path("apps/api/app"), Path("apps/api/tests"), Path("apps/control-plane-v3/src")]:
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix not in EXCLUDED_SUFFIXES:
                continue
            text = path.read_text()
            for label, pattern in FORBIDDEN_PATTERNS:
                if pattern.search(text):
                    offenders.append((str(path), label))

    assert offenders == []
