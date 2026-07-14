from types import SimpleNamespace

from starlette.requests import Request

from app.client_ip import get_client_ip


def _request(
    direct_ip: str,
    forwarded_for: str | None,
    trusted_proxy_cidrs: str,
) -> Request:
    headers = []
    if forwarded_for is not None:
        headers.append((b"x-forwarded-for", forwarded_for.encode()))
    app = SimpleNamespace(state=SimpleNamespace(
        settings=SimpleNamespace(trusted_proxy_cidrs=trusted_proxy_cidrs)
    ))
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": headers,
            "client": (direct_ip, 1234),
            "app": app,
        }
    )


def test_untrusted_peer_cannot_spoof_forwarded_client_ip() -> None:
    request = _request("203.0.113.10", "198.51.100.25", "172.30.0.0/24")

    assert get_client_ip(request) == "203.0.113.10"


def test_trusted_proxy_cidr_uses_valid_leftmost_forwarded_ip() -> None:
    request = _request(
        "172.30.0.2",
        "198.51.100.25, 172.30.0.2",
        "172.30.0.0/24",
    )

    assert get_client_ip(request) == "198.51.100.25"


def test_trusted_proxy_rejects_invalid_forwarded_ip() -> None:
    request = _request("172.30.0.2", "spoofed", "172.30.0.0/24")

    assert get_client_ip(request) == "172.30.0.2"
