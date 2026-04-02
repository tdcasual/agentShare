def test_catalog_lists_agent_published_secret_and_capability(client, management_client):
    secret = client.post(
        "/api/secrets",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "display_name": "Catalog Secret",
            "kind": "api_token",
            "value": "sk-catalog-secret",
            "provider": "openai",
        },
    )
    assert secret.status_code == 202, secret.text

    capability = client.post(
        "/api/capabilities",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "name": "catalog.capability",
            "secret_id": secret.json()["id"],
            "risk_level": "low",
        },
    )
    assert capability.status_code == 202, capability.text

    approve_secret = management_client.post(f"/api/reviews/secret/{secret.json()['id']}/approve", json={})
    approve_capability = management_client.post(f"/api/reviews/capability/{capability.json()['id']}/approve", json={})

    assert approve_secret.status_code == 200, approve_secret.text
    assert approve_capability.status_code == 200, approve_capability.text

    catalog = management_client.get("/api/catalog")

    assert catalog.status_code == 200, catalog.text
    items = catalog.json()["items"]
    assert {(item["resource_kind"], item["resource_id"]) for item in items} >= {
        ("secret", secret.json()["id"]),
        ("capability", capability.json()["id"]),
    }

    secret_item = next(
        item for item in items if item["resource_kind"] == "secret" and item["resource_id"] == secret.json()["id"]
    )
    capability_item = next(
        item
        for item in items
        if item["resource_kind"] == "capability" and item["resource_id"] == capability.json()["id"]
    )

    assert secret_item["version"] == 1
    assert secret_item["release_status"] == "published"
    assert secret_item["title"] == "Catalog Secret"
    assert capability_item["version"] == 1
    assert capability_item["release_status"] == "published"
    assert capability_item["title"] == "catalog.capability"
