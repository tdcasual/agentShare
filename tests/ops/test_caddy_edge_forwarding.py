from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]

_PROXY_BLOCK = re.compile(r"reverse_proxy\s+\S+\s*\{((?:[^{}]|\{[^}]*\})*)\}")


def test_caddy_overwrites_x_forwarded_for_at_the_edge() -> None:
    """Every reverse_proxy must overwrite X-Forwarded-For with the real peer.

    Caddy appends to a client-supplied X-Forwarded-For by default, which would
    let clients spoof their IP for audit attribution and IP-based rate
    limiting. The edge must replace the header instead.
    """
    caddyfile = (ROOT / "ops/caddy/Caddyfile").read_text()

    blocks = _PROXY_BLOCK.findall(caddyfile)
    assert len(blocks) >= 2, "expected multiple reverse_proxy blocks"
    for block in blocks:
        assert "header_up X-Forwarded-For {remote_host}" in block
