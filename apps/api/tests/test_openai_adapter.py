from unittest.mock import patch, MagicMock

import pytest

from app.services.adapters.openai_adapter import OpenAIAdapter
from app.services.adapters.registry import get_adapter


def test_openai_adapter_registered():
    adapter = get_adapter("openai")
    assert isinstance(adapter, OpenAIAdapter)


@patch("app.services.adapters.openai_adapter.httpx.post")
def test_openai_chat_completion(mock_post):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "id": "chatcmpl-abc",
        "choices": [{"message": {"role": "assistant", "content": "Hello!"}}],
        "usage": {"prompt_tokens": 5, "completion_tokens": 7, "total_tokens": 12},
    }
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    adapter = OpenAIAdapter()
    result = adapter.invoke(
        secret_value="sk-test-key",
        adapter_config={"model": "gpt-4"},
        parameters={"messages": [{"role": "user", "content": "Hi"}]},
    )

    mock_post.assert_called_once()
    call_kwargs = mock_post.call_args
    assert call_kwargs.kwargs["headers"]["Authorization"] == "Bearer sk-test-key"
    body = call_kwargs.kwargs["json"]
    assert body["model"] == "gpt-4"
    assert body["messages"] == [{"role": "user", "content": "Hi"}]
    assert result["body"]["choices"][0]["message"]["content"] == "Hello!"


@patch("app.services.adapters.openai_adapter.httpx.post")
def test_openai_custom_base_url(mock_post):
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": []}
    mock_resp.raise_for_status = MagicMock()
    mock_post.return_value = mock_resp

    adapter = OpenAIAdapter()
    adapter.invoke(
        secret_value="sk-test",
        adapter_config={"model": "gpt-4", "base_url": "https://custom.openai.example.com/v1"},
        parameters={"messages": []},
    )

    url = mock_post.call_args.kwargs.get("url") or mock_post.call_args[0][0]
    assert "custom.openai.example.com" in url
