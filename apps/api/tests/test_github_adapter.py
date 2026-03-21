from unittest.mock import MagicMock, patch

from app.services.adapters.github_adapter import GitHubAdapter
from app.services.adapters.registry import get_adapter


def test_github_adapter_registered():
    adapter = get_adapter("github")
    assert isinstance(adapter, GitHubAdapter)


@patch("app.services.adapters.github_adapter.httpx.get")
def test_github_adapter_formats_repo_path_and_query_params(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [{"number": 1, "title": "Hello"}]
    mock_response.raise_for_status = MagicMock()
    mock_get.return_value = mock_response

    adapter = GitHubAdapter()
    result = adapter.invoke(
        secret_value="ghp_test",
        adapter_config={
            "method": "GET",
            "path": "/repos/{owner}/{repo}/issues",
        },
        parameters={
            "owner": "openai",
            "repo": "agent-share",
            "state": "open",
            "per_page": 10,
        },
    )

    call_kwargs = mock_get.call_args.kwargs
    assert call_kwargs["url"] == "https://api.github.com/repos/openai/agent-share/issues"
    assert call_kwargs["params"] == {"state": "open", "per_page": 10}
    assert call_kwargs["headers"]["Authorization"] == "Bearer ghp_test"
    assert call_kwargs["headers"]["Accept"] == "application/vnd.github+json"
    assert result == {
        "adapter_type": "github",
        "upstream_status": 200,
        "body": [{"number": 1, "title": "Hello"}],
    }
