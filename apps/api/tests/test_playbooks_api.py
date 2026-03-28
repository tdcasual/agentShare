def test_create_playbook_returns_saved_record(management_client):
    response = management_client.post(
        "/api/playbooks",
        json={
            "title": "QQ config sync",
            "task_type": "config_sync",
            "body": "Validate capability, invoke provider update, confirm success.",
            "tags": ["qq", "config"],
        },
    )

    assert response.status_code == 201
    assert response.json()["id"].startswith("playbook-")
    assert response.json()["id"] != "playbook-1"
    assert response.json()["title"] == "QQ config sync"


def test_search_playbooks_filters_by_task_type(management_client):
    management_client.post(
        "/api/playbooks",
        json={
            "title": "QQ config sync",
            "task_type": "config_sync",
            "body": "Validate capability, invoke provider update, confirm success.",
            "tags": ["qq", "config"],
        },
    )
    management_client.post(
        "/api/playbooks",
        json={
            "title": "OpenAI prompt run",
            "task_type": "prompt_run",
            "body": "Invoke prompt capability and store run summary.",
            "tags": ["openai"],
        },
    )

    response = management_client.get("/api/playbooks/search", params={"task_type": "config_sync"})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["task_type"] == "config_sync"
    assert payload["meta"]["total"] == 1
    assert payload["meta"]["items_count"] == 1
    assert payload["meta"]["applied_filters"] == {"task_type": "config_sync"}


def test_search_playbooks_supports_query_and_tag_filters(management_client):
    management_client.post(
        "/api/playbooks",
        json={
            "title": "QQ config sync",
            "task_type": "config_sync",
            "body": "Validate capability, invoke provider update, confirm success.",
            "tags": ["qq", "config"],
        },
    )
    management_client.post(
        "/api/playbooks",
        json={
            "title": "OpenAI prompt run",
            "task_type": "prompt_run",
            "body": "Invoke prompt capability and store run summary.",
            "tags": ["openai"],
        },
    )

    response = management_client.get(
        "/api/playbooks/search",
        params={"q": "prompt", "tag": "openai"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["title"] == "OpenAI prompt run"
    assert payload["meta"]["total"] == 1
    assert payload["meta"]["items_count"] == 1
    assert payload["meta"]["applied_filters"] == {"q": "prompt", "tag": "openai"}


def test_get_playbook_by_id_returns_full_record(management_client):
    created = management_client.post(
        "/api/playbooks",
        json={
            "title": "Playbook detail lookup",
            "task_type": "prompt_run",
            "body": "Use this body in detail view.",
            "tags": ["detail"],
        },
    )
    assert created.status_code == 201
    playbook_id = created.json()["id"]

    response = management_client.get(f"/api/playbooks/{playbook_id}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == playbook_id
    assert payload["body"] == "Use this body in detail view."


def test_get_playbook_by_id_returns_404_when_missing(management_client):
    response = management_client.get("/api/playbooks/playbook-missing")
    assert response.status_code == 404
    assert response.json() == {"detail": "Playbook not found"}
