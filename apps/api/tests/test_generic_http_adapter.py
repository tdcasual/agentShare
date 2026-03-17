from unittest.mock import patch, MagicMock

import httpx
import pytest

from app.services.adapters.base import CapabilityAdapter
from app.services.adapters.generic_http import GenericHttpAdapter
from app.services.adapters.registry import get_adapter


def test_adapter_protocol_compliance():
    """GenericHttpAdapter must satisfy the CapabilityAdapter protocol."""
    adapter = GenericHttpAdapter()
    assert isinstance(adapter, CapabilityAdapter)


def test_registry_returns_generic_http_by_default():
    adapter = get_adapter("generic_http")
    assert isinstance(adapter, GenericHttpAdapter)


def test_registry_raises_for_unknown():
    with pytest.raises(KeyError):
        get_adapter("nonexistent_adapter")


@patch("app.services.adapters.generic_http.httpx.post")
def test_generic_http_invoke(mock_post):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"result": "ok"}
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    adapter = GenericHttpAdapter()
    result = adapter.invoke(
        secret_value="sk-test-123",
        adapter_config={"url": "https://api.example.com/v1/run", "method": "POST"},
        parameters={"prompt": "hello"},
    )

    mock_post.assert_called_once()
    call_kwargs = mock_post.call_args
    assert "Authorization" in call_kwargs.kwargs.get("headers", call_kwargs[1].get("headers", {}))
    assert result == {"status_code": 200, "body": {"result": "ok"}}


@patch("app.services.adapters.generic_http.httpx.post")
def test_generic_http_custom_header_key(mock_post):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {}
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    adapter = GenericHttpAdapter()
    adapter.invoke(
        secret_value="my-token",
        adapter_config={
            "url": "https://api.example.com/run",
            "method": "POST",
            "auth_header": "X-Api-Key",
        },
        parameters={},
    )

    headers = mock_post.call_args.kwargs.get("headers", mock_post.call_args[1].get("headers", {}))
    assert headers.get("X-Api-Key") == "my-token"
