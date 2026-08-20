from __future__ import annotations

from tests.asgi_client import TestClient
from tests.test_admin_api import bootstrap_and_login


def test_agent_onboarding_invite_approval_and_one_time_credential(client: TestClient) -> None:
    bootstrap_and_login(client)
    space = client.post("/api/admin/spaces", json={"name": "Shared"})
    assert space.status_code == 201
    invite = client.post(
        "/api/admin/agent-invites",
        headers={"Idempotency-Key": "invite-create-1"},
        json={"label": "Deploy onboarding", "space_id": space.json()["id"], "role": "contributor"},
    )
    assert invite.status_code == 201
    assert invite.json()["code"].startswith("vgi_")

    request = client.post(
        "/api/onboarding/v1/requests",
        headers={"Idempotency-Key": "join-request-1"},
        json={"invite_code": invite.json()["code"], "agent_name": "Deploy Agent"},
    )
    assert request.status_code == 201
    request_secret = request.json()["request_secret"]
    request_id = request.json()["request_id"]

    replay = client.post(
        "/api/onboarding/v1/requests",
        headers={"Idempotency-Key": "join-request-1"},
        json={"invite_code": invite.json()["code"], "agent_name": "Deploy Agent"},
    )
    assert replay.status_code == 201
    assert replay.json() == request.json()

    status = client.get(
        f"/api/onboarding/v1/requests/{request_id}",
        headers={"Authorization": f"Bearer {request_secret}"},
    )
    assert status.json() == {"status": "pending"}

    approved = client.post(
        f"/api/admin/agent-join-requests/{request_id}/approve",
        json={"token_name": "onboarding", "role": "contributor"},
    )
    assert approved.status_code == 200
    agent_id = approved.json()["agent_id"]

    credential = client.post(
        f"/api/onboarding/v1/requests/{request_id}/credential",
        headers={"Authorization": f"Bearer {request_secret}", "Idempotency-Key": "claim-1"},
    )
    assert credential.status_code == 200
    token = credential.json()["token"]
    assert token.startswith("vg_")
    assert client.get("/api/vault/me", headers={"Authorization": f"Bearer {token}"}).json()["agent_id"] == agent_id

    claim_replay = client.post(
        f"/api/onboarding/v1/requests/{request_id}/credential",
        headers={"Authorization": f"Bearer {request_secret}", "Idempotency-Key": "claim-1"},
    )
    assert claim_replay.status_code == 200
    assert claim_replay.json() == credential.json()

    second_claim = client.post(
        f"/api/onboarding/v1/requests/{request_id}/credential",
        headers={"Authorization": f"Bearer {request_secret}", "Idempotency-Key": "claim-2"},
    )
    assert second_claim.status_code == 409

    # Onboarding credentials never cross into admin or vault authentication.
    assert client.get(
        "/api/vault/me",
        headers={"Authorization": f"Bearer {request_secret}"},
    ).status_code == 401
    assert client.get(
        "/api/admin/agents",
        headers={"Authorization": f"Bearer {request_secret}"},
    ).status_code == 401

    # A successful credential claim is auditable without storing the token.
    audit = client.get("/api/admin/audit-logs").json()["items"]
    credential_reads = [entry for entry in audit if entry["action"] == "agent_join.credential.read"]
    assert len(credential_reads) == 1
    assert token not in str(credential_reads[0])


def test_onboarding_submit_is_rate_limited_per_client_ip(client: TestClient) -> None:
    payload = {"invite_code": "vgi_invalid_code_value", "agent_name": "unknown"}
    for _ in range(20):
        assert client.post("/api/onboarding/v1/requests", json=payload).status_code == 404
    limited = client.post("/api/onboarding/v1/requests", json=payload)
    assert limited.status_code == 429
