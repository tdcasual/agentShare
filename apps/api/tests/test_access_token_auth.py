from app.services.access_token_service import mint_access_token


def test_access_token_auth_resolves_token_principal(client, db_session):
    token, raw_token = mint_access_token(
        db_session,
        display_name="CI remote runner",
        subject_type="automation",
        subject_id="ci-runner",
        scopes=["runtime"],
        labels={"env": "staging"},
        issued_by_actor_type="human",
        issued_by_actor_id="owner-test",
    )
    db_session.commit()

    response = client.get("/api/runtime/me", headers={"Authorization": f"Bearer {raw_token}"})

    assert response.status_code == 200
    assert response.json()["auth_method"] == "access_token"
    assert response.json()["token_id"] == token.id
    assert response.json()["subject_type"] == "automation"
    assert response.json()["subject_id"] == "ci-runner"


def test_access_token_without_runtime_scope_is_rejected(client, db_session):
    _, raw_token = mint_access_token(
        db_session,
        display_name="Reports only token",
        subject_type="automation",
        subject_id="reporter",
        scopes=["reports"],
        labels={},
        issued_by_actor_type="human",
        issued_by_actor_id="owner-test",
    )
    db_session.commit()

    response = client.get("/api/runtime/me", headers={"Authorization": f"Bearer {raw_token}"})

    assert response.status_code == 403
    assert response.json() == {"detail": "Access token lacks runtime scope"}
