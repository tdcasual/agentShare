from __future__ import annotations


def test_create_space_and_fetch_details(management_client):
    created = management_client.post(
        "/api/spaces",
        json={
            "name": "Ops Triage",
            "summary": "Coordinate review and runtime follow-up",
        },
    )

    assert created.status_code == 201, created.text
    payload = created.json()
    assert payload["name"] == "Ops Triage"
    assert payload["summary"] == "Coordinate review and runtime follow-up"
    assert payload["status"] == "active"
    assert payload["members"] == []
    assert payload["timeline"] == []

    fetched = management_client.get(f"/api/spaces/{payload['id']}")

    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["id"] == payload["id"]


def test_add_member_to_space(management_client):
    created = management_client.post(
        "/api/spaces",
        json={
            "name": "Runtime Follow-up",
            "summary": "Track agent execution issues",
        },
    )
    assert created.status_code == 201, created.text
    space_id = created.json()["id"]

    member = management_client.post(
        f"/api/spaces/{space_id}/members",
        json={
            "member_type": "agent",
            "member_id": "test-agent",
            "role": "participant",
        },
    )

    assert member.status_code == 201, member.text
    assert member.json()["member_id"] == "test-agent"
    assert member.json()["member_type"] == "agent"
    assert member.json()["role"] == "participant"

    fetched = management_client.get(f"/api/spaces/{space_id}")
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["members"] == [member.json()]


def test_list_spaces_can_filter_by_agent_id(management_client):
    alpha = management_client.post(
        "/api/spaces",
        json={"name": "Alpha", "summary": "Alpha summary"},
    )
    beta = management_client.post(
        "/api/spaces",
        json={"name": "Beta", "summary": "Beta summary"},
    )
    assert alpha.status_code == 201, alpha.text
    assert beta.status_code == 201, beta.text

    alpha_id = alpha.json()["id"]
    beta_id = beta.json()["id"]

    attach = management_client.post(
        f"/api/spaces/{alpha_id}/members",
        json={
            "member_type": "agent",
            "member_id": "test-agent",
            "role": "participant",
        },
    )
    assert attach.status_code == 201, attach.text

    listing = management_client.get("/api/spaces")
    assert listing.status_code == 200, listing.text
    assert {item["id"] for item in listing.json()["items"]} >= {alpha_id, beta_id}

    filtered = management_client.get("/api/spaces", params={"agent_id": "test-agent"})
    assert filtered.status_code == 200, filtered.text
    assert [item["id"] for item in filtered.json()["items"]] == [alpha_id]
