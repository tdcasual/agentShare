from unittest.mock import MagicMock

from app.services.adapters.openai_adapter import OpenAIAdapter
from app.services.adapters.registry import get_adapter


def test_openai_adapter_registered():
    adapter = get_adapter("openai")
    assert isinstance(adapter, OpenAIAdapter)


def test_openai_chat_completion():
    client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "chatcmpl-abc",
        "choices": [{"message": {"role": "assistant", "content": "Hello!"}}],
        "usage": {"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12},
    }
    mock_resp.raise_for_status = MagicMock()
    client.request.return_value = mock_resp

    adapter = OpenAIAdapter(client=client)
    result = adapter.invoke(
        secret_value="sk-test-key",
        adapter_config={"model": "gpt-4"},
        parameters={"messages": [{"role": "user", "content": "Hi"}]},
    )

    client.request.assert_called_once()
    call_args = client.request.call_args
    assert call_args.args[0] == "POST"
    assert call_args.kwargs["headers"]["Authorization"] == "Bearer sk-test-key"
    body = call_args.kwargs["json"]
    assert body["model"] == "gpt-4"
    assert body["messages"] == [{"role": "user", "content": "Hi"}]
    assert result["adapter_type"] == "openai"
    assert result["upstream_status"] == 200
    assert result["body"]["choices"][0]["message"]["content"] == "Hello!"


def test_openai_custom_base_url_and_client_reuse():
    client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": []}
    mock_resp.raise_for_status = MagicMock()
    client.request.return_value = mock_resp

    adapter = OpenAIAdapter(client=client)
    adapter.invoke(
        secret_value="sk-test",
        adapter_config={"model": "gpt-4", "base_url": "https://custom.openai.example.com/v1"},
        parameters={"messages": []},
    )
    adapter.invoke(
        secret_value="sk-test",
        adapter_config={"model": "gpt-4", "base_url": "https://custom.openai.example.com/v1"},
        parameters={"messages": []},
    )

    assert client.request.call_count == 2
    url = client.request.call_args.kwargs["url"]
    assert "custom.openai.example.com" in url
