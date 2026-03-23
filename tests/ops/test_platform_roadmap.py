from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_platform_roadmap_covers_p3_targets() -> None:
    guide = (ROOT / "docs/guides/platform-roadmap.md").read_text().lower()

    assert "multi-host" in guide or "high-availability" in guide
    assert "managed postgres" in guide or "managed or replicated" in guide
    assert "sso" in guide
    assert "secret rotation" in guide
    assert "outside this repository" in guide
