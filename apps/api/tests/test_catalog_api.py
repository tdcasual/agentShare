from app.orm.catalog_release import CatalogReleaseModel


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
    assert secret_item["release_notes"] is None
    assert secret_item["prior_versions"] == 0
    assert capability_item["version"] == 1
    assert capability_item["release_status"] == "published"
    assert capability_item["title"] == "catalog.capability"
    assert capability_item["release_notes"] is None
    assert capability_item["prior_versions"] == 0


def test_catalog_does_not_synthesize_published_items_without_release_records(client, management_client, db_session):
    secret = client.post(
        "/api/secrets",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "display_name": "Release-backed Secret",
            "kind": "api_token",
            "value": "sk-release-backed-secret",
            "provider": "openai",
        },
    )
    assert secret.status_code == 202, secret.text

    approved = management_client.post(f"/api/reviews/secret/{secret.json()['id']}/approve", json={})
    assert approved.status_code == 200, approved.text

    db_session.query(CatalogReleaseModel).filter(CatalogReleaseModel.resource_id == secret.json()["id"]).delete()
    db_session.commit()

    catalog = management_client.get("/api/catalog")

    assert catalog.status_code == 200, catalog.text
    assert all(item["resource_id"] != secret.json()["id"] for item in catalog.json()["items"])


def test_catalog_can_return_release_history_for_a_resource(client, management_client, db_session):
    secret = client.post(
        "/api/secrets",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "display_name": "Versioned Secret",
            "kind": "api_token",
            "value": "sk-versioned-secret",
            "provider": "openai",
        },
    )
    assert secret.status_code == 202, secret.text

    approved = management_client.post(f"/api/reviews/secret/{secret.json()['id']}/approve", json={})
    assert approved.status_code == 200, approved.text

    release = (
        db_session.query(CatalogReleaseModel)
        .filter(CatalogReleaseModel.resource_id == secret.json()["id"])
        .one()
    )
    release.release_notes = "Initial release"
    db_session.add(CatalogReleaseModel(
        id="catalog-release-v2",
        resource_kind="secret",
        resource_id=secret.json()["id"],
        title="Versioned Secret",
        subtitle="openai · api_token",
        version=2,
        release_status="published",
        released_at=release.released_at,
        created_by_actor_id=release.created_by_actor_id,
        created_via_token_id=release.created_via_token_id,
        adoption_count=3,
        release_notes="Second release",
    ))
    db_session.commit()

    response = management_client.get(f"/api/catalog/secret/{secret.json()['id']}")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["current_release"]["version"] == 2
    assert payload["current_release"]["release_notes"] == "Second release"
    assert [item["version"] for item in payload["prior_releases"]] == [1]


def test_catalog_can_filter_latest_items_by_resource_kind_and_release_status(client, management_client, db_session):
    secret = client.post(
        "/api/secrets",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "display_name": "Filter Secret",
            "kind": "api_token",
            "value": "sk-filter-secret",
            "provider": "openai",
        },
    )
    assert secret.status_code == 202, secret.text

    capability = client.post(
        "/api/capabilities",
        headers={"Authorization": "Bearer agent-test-token"},
        json={
            "name": "filter.capability",
            "secret_id": secret.json()["id"],
            "risk_level": "low",
        },
    )
    assert capability.status_code == 202, capability.text

    assert management_client.post(f"/api/reviews/secret/{secret.json()['id']}/approve", json={}).status_code == 200
    assert management_client.post(
        f"/api/reviews/capability/{capability.json()['id']}/approve",
        json={},
    ).status_code == 200

    capability_release = (
        db_session.query(CatalogReleaseModel)
        .filter(CatalogReleaseModel.resource_id == capability.json()["id"])
        .one()
    )
    capability_release.release_status = "archived"
    db_session.commit()

    secrets_only = management_client.get("/api/catalog", params={"resource_kind": "secret"})
    archived_only = management_client.get("/api/catalog", params={"release_status": "archived"})

    assert secrets_only.status_code == 200, secrets_only.text
    assert archived_only.status_code == 200, archived_only.text
    assert {item["resource_kind"] for item in secrets_only.json()["items"]} == {"secret"}
    assert [item["resource_id"] for item in archived_only.json()["items"]] == [capability.json()["id"]]
