from __future__ import annotations

from ipaddress import ip_address, ip_network

from fastapi import Request


def get_client_ip(request: Request) -> str:
    direct_ip = request.client.host if request.client else "unknown"
    app = request.scope.get("app")
    state = getattr(app, "state", None)
    settings = getattr(state, "settings", None)
    configured = getattr(settings, "trusted_proxy_cidrs", "")

    try:
        peer = ip_address(direct_ip)
    except ValueError:
        return direct_ip

    trusted_networks = []
    for value in configured.split(","):
        if normalized := value.strip():
            trusted_networks.append(ip_network(normalized, strict=False))
    if not any(peer in network for network in trusted_networks):
        return direct_ip

    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    if not forwarded:
        return direct_ip
    try:
        return str(ip_address(forwarded))
    except ValueError:
        return direct_ip
