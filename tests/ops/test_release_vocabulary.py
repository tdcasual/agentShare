from pathlib import Path


def _term(*parts: str) -> str:
    return "".join(parts)


def test_current_docs_do_not_use_removed_agent_token_vocabulary():
    roots = [Path("README.md"), Path("docs/guides")]
    forbidden = [
        _term("agent", " ", "token"),
        _term("agent", " ", "tokens"),
        _term("remote", " ", "agent", " ", "profile"),
        _term("/", "api", "/", "agents"),
        _term("/", "api", "/", "agent", "-", "tokens"),
        _term("legacy", "_", "name"),
        _term("legacy", " ", "tool"),
    ]
    offenders: list[tuple[str, str]] = []

    for root in roots:
        paths = [root] if root.is_file() else list(root.rglob("*.md"))
        for path in paths:
            text = path.read_text().lower()
            for needle in forbidden:
                if needle in text:
                    offenders.append((str(path), needle))

    assert offenders == []
