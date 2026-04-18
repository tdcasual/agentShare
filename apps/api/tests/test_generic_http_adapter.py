from unittest.mock import MagicMock

import pytest
import httpx

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


def test_generic_http_invoke():
    client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"result": "ok"}
    mock_resp.raise_for_status = MagicMock()
    client.request.return_value = mock_resp

    adapter = GenericHttpAdapter(client=client)
    result = adapter.invoke(
        secret_value="sk-test-123",
        adapter_config={"url": "https://api.example.com/v1/run", "method": "POST"},
        parameters={"prompt": "hello"},
    )

    client.request.assert_called_once()
    call_kwargs = client.request.call_args
    assert call_kwargs.args[0] == "POST"
    assert "Authorization" in call_kwargs.kwargs["headers"]
    assert result == {
        "adapter_type": "generic_http",
        "upstream_status": 200,
        "body": {"result": "ok"},
    }


def test_generic_http_custom_header_key_and_client_reuse():
    client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {}
    mock_resp.raise_for_status = MagicMock()
    client.request.return_value = mock_resp

    adapter = GenericHttpAdapter(client=client)
    adapter.invoke(
        secret_value="my-token",
        adapter_config={
            "url": "https://api.example.com/run",
            "method": "POST",
            "auth_header": "X-Api-Key",
        },
        parameters={},
    )
    adapter.invoke(
        secret_value="my-token",
        adapter_config={
            "url": "https://api.example.com/run",
            "method": "POST",
            "auth_header": "X-Api-Key",
        },
        parameters={},
    )

    assert client.request.call_count == 2
    headers = client.request.call_args.kwargs["headers"]
    assert headers.get("X-Api-Key") == "my-token"


def test_generic_http_accepts_empty_204_success_response():
    client = MagicMock()
    client.request.return_value = httpx.Response(
        204,
        request=httpx.Request("POST", "https://api.example.com/run"),
    )

    adapter = GenericHttpAdapter(client=client)
    result = adapter.invoke(
        secret_value="sk-test-123",
        adapter_config={"url": "https://api.example.com/v1/run", "method": "POST"},
        parameters={"prompt": "hello"},
    )

    assert result == {
        "adapter_type": "generic_http",
        "upstream_status": 204,
        "body": None,
    }


def test_generic_http_accepts_non_json_success_response_body():
    client = MagicMock()
    client.request.return_value = httpx.Response(
        200,
        text="ok",
        headers={"content-type": "text/plain"},
        request=httpx.Request("POST", "https://api.example.com/run"),
    )

    adapter = GenericHttpAdapter(client=client)
    result = adapter.invoke(
        secret_value="sk-test-123",
        adapter_config={"url": "https://api.example.com/v1/run", "method": "POST"},
        parameters={"prompt": "hello"},
    )

    assert result == {
        "adapter_type": "generic_http",
        "upstream_status": 200,
        "body": "ok",
    }
