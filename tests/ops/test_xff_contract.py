"""Cross-layer X-Forwarded-For contract.

Three components independently process X-Forwarded-For, and audit attribution
plus IP-based rate limiting are only correct if they compose:

- Caddy edge OVERWRITES XFF with the observed peer (single entry).
  Pinned separately in test_caddy_edge_forwarding.py.
- The Next.js /api proxy takes the LAST hop of whatever chain it receives and
  forwards exactly that single entry upstream.
- The FastAPI client_ip resolver trusts XFF only from TRUSTED_PROXY_CIDRS and
  reads the FIRST entry.

Single-entry forwarding by the proxy is the invariant that makes "backend
reads first" and "proxy picks last" agree in both supported topologies. This
test pins the source-level contract on both sides and exercises the composed
behavior against the deployment topologies, including spoofing attempts.
"""
from __future__ import annotations

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]

PROXY_ROUTE = ROOT / "apps/control-plane-v3/src/app/api/[...path]/route.ts"
CLIENT_IP = ROOT / "apps/api/app/client_ip.py"


# ---------------------------------------------------------------------------
# Source-level contract: the two implementations must keep their half of the
# bargain, otherwise the topology tests below silently stop representing the
# real code.
# ---------------------------------------------------------------------------


def test_proxy_selects_last_hop_and_forwards_a_single_entry() -> None:
    source = PROXY_ROUTE.read_text()
    # Last hop of the incoming chain (edge proxies append the peer they see).
    assert ".pop()" in source
    # X-Real-IP fallback when no chain exists.
    assert "x-real-ip" in source
    # Exactly one entry is forwarded: a plain assignment, never a
    # concatenation with the incoming chain.
    assert "headers['x-forwarded-for'] = forwardedFor" in source
    assert "headers['x-forwarded-for'] +=" not in source
    assert "`${forwardedFor}" not in source


def test_backend_reads_first_entry_and_requires_trusted_proxy() -> None:
    source = CLIENT_IP.read_text()
    # First entry of the (single-entry) forwarded header.
    assert 'split(",", 1)[0]' in source
    # XFF is only honored when the direct peer is in a configured trust CIDR.
    assert "trusted_proxy_cidrs" in source


# ---------------------------------------------------------------------------
# Composed behavior. The two helpers mirror the implementations above; the
# source-level tests guard against the real code drifting away from them.
# ---------------------------------------------------------------------------


def proxy_forwarded_xff(
    incoming_xff: str | None, incoming_x_real_ip: str | None
) -> str | None:
    """Mirror of apps/control-plane-v3/src/app/api/[...path]/route.ts."""
    if incoming_xff:
        chain = [entry.strip() for entry in incoming_xff.split(",") if entry.strip()]
        if chain:
            return chain[-1]
    return incoming_x_real_ip


def backend_client_ip(
    direct_peer: str, forwarded_for: str | None, trusted_peer: bool
) -> str:
    """Mirror of apps/api/app/client_ip.py."""
    if not trusted_peer:
        return direct_peer
    if not forwarded_for:
        return direct_peer
    first = forwarded_for.split(",", 1)[0].strip()
    try:
        parts = first.split(".")
        if len(parts) != 4 or any(not part.isdigit() or not 0 <= int(part) <= 255 for part in parts):
            return direct_peer
    except ValueError:
        return direct_peer
    return first or direct_peer


CLIENT = "203.0.113.7"
EDGE = "172.30.0.2"
TRUSTED = "172.30.0.0/24"  # noqa: F841 — documents the deployment value


@pytest.mark.parametrize("spoofed", ["198.51.100.99", "127.0.0.1, 198.51.100.99", ""])
def test_caddy_topology_client_ip_survives_spoofing(spoofed: str) -> None:
    """Caddy topology: /api/* goes edge -> api directly. The edge overwrites
    XFF with the single observed peer, so the backend's first-entry read
    always yields the real client regardless of client-supplied headers."""
    edge_xff = CLIENT  # Caddy overwrites, never appends
    assert backend_client_ip(direct_peer=EDGE, forwarded_for=edge_xff, trusted_peer=True) == CLIENT
    # Even if the overwrite regressed to an append, the client-controlled
    # prefix must not change the attribution... via the web proxy path:
    if spoofed:
        forwarded = proxy_forwarded_xff(f"{spoofed}, {CLIENT}", None)
        assert forwarded == CLIENT
        assert backend_client_ip(EDGE, forwarded, trusted_peer=True) == CLIENT


def test_coolify_topology_proxy_collapses_appended_chain() -> None:
    """Coolify topology: all traffic lands on Next.js; Traefik APPENDS the
    observed client to any client-supplied chain. The proxy must collapse the
    chain to its last hop (the edge-observed peer) before the backend's
    first-entry read sees it."""
    incoming = f"198.51.100.99, 127.0.0.1, {CLIENT}"  # spoofed prefix + real client
    forwarded = proxy_forwarded_xff(incoming, None)
    assert forwarded == CLIENT  # single entry
    assert "," not in (forwarded or "")
    assert backend_client_ip(EDGE, forwarded, trusted_peer=True) == CLIENT


def test_proxy_falls_back_to_x_real_ip_when_no_chain() -> None:
    forwarded = proxy_forwarded_xff(None, CLIENT)
    assert forwarded == CLIENT
    assert backend_client_ip(EDGE, forwarded, trusted_peer=True) == CLIENT


def test_untrusted_peer_header_is_never_honored() -> None:
    """Without TRUSTED_PROXY_CIDRS matching the direct peer, XFF is ignored:
    a directly exposed API cannot be lied to via headers."""
    assert backend_client_ip("203.0.113.10", "198.51.100.25", trusted_peer=False) == "203.0.113.10"
