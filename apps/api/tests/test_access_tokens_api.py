def test_admin_can_create_list_and_revoke_access_tokens(management_client):
    created = management_client.post(
        "/api/access-tokens",
        json={
            "display_name": "Remote build runner",
            "subject_type": "automation",
            "subject_id": "github-actions",
            "scopes": ["runtime"],
            "labels": {"env": "staging"},
        },
    )

    assert created.status_code == 201, created.text
    payload = created.json()
    assert payload["api_key"]
    assert payload["subject_type"] == "automation"
    assert payload["subject_id"] == "github-actions"
    assert "agent_id" not in payload

    listed = management_client.get("/api/access-tokens")
    assert listed.status_code == 200
    items = listed.json()["items"]
    assert {item["id"] for item in items} >= {payload["id"]}

    revoked = management_client.post(f"/api/access-tokens/{payload['id']}/revoke")
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"


def test_admin_can_reveal_access_token_secret_after_creation(management_client):
    created = management_client.post(
        "/api/access-tokens",
        json={
            "display_name": "Revealable build runner",
            "subject_type": "automation",
            "subject_id": "github-actions",
            "scopes": ["runtime"],
        },
    )

    assert created.status_code == 201, created.text
    payload = created.json()

    revealed = management_client.get(f"/api/access-tokens/{payload['id']}/secret")

    assert revealed.status_code == 200, revealed.text
    assert revealed.json() == {"id": payload["id"], "api_key": payload["api_key"]}

    listed = management_client.get("/api/access-tokens")
    assert listed.status_code == 200
    assert all("api_key" not in item or item["api_key"] is None for item in listed.json()["items"])
