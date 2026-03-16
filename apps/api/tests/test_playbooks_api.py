def test_create_playbook_returns_saved_record(client):
    response = client.post(
        "/api/playbooks",
        json={
            "title": "QQ config sync",
            "task_type": "config_sync",
            "body": "Validate capability, invoke provider update, confirm success.",
            "tags": ["qq", "config"],
        },
    )

    assert response.status_code == 201
    assert response.json()["title"] == "QQ config sync"


def test_search_playbooks_filters_by_task_type(client):
    client.post(
        "/api/playbooks",
        json={
            "title": "QQ config sync",
            "task_type": "config_sync",
            "body": "Validate capability, invoke provider update, confirm success.",
            "tags": ["qq", "config"],
        },
    )
    client.post(
        "/api/playbooks",
        json={
            "title": "OpenAI prompt run",
            "task_type": "prompt_run",
            "body": "Invoke prompt capability and store run summary.",
            "tags": ["openai"],
        },
    )

    response = client.get("/api/playbooks/search", params={"task_type": "config_sync"})

    assert response.status_code == 200
    assert len(response.json()["items"]) == 1
    assert response.json()["items"][0]["task_type"] == "config_sync"
