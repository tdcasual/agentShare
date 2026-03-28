def _field_for(variant: dict, key: str) -> dict:
    for section in variant["sections"]:
        for field in section["fields"]:
            if field["key"] == key:
                return field
    raise AssertionError(f"Field {key} not found")


def test_intake_catalog_requires_management_session(client, management_client):
    missing = client.get("/api/intake-catalog")
    assert missing.status_code == 401

    allowed = management_client.get("/api/intake-catalog")
    assert allowed.status_code == 200


def test_intake_catalog_exposes_resource_variants_and_field_metadata(management_client):
    response = management_client.get("/api/intake-catalog")

    assert response.status_code == 200
    payload = response.json()
    resource_kinds = {item["kind"]: item for item in payload["resource_kinds"]}

    assert set(resource_kinds) == {"secret", "capability", "task", "agent"}

    secret_catalog = resource_kinds["secret"]
    assert secret_catalog["default_variant"] == "generic_secret"
    openai_secret = next(
        variant for variant in secret_catalog["variants"] if variant["variant"] == "openai_api_token"
    )
    provider_field = _field_for(openai_secret, "provider")
    assert provider_field["default_value"] == "openai"
    assert provider_field["read_only"] is True

    capability_catalog = resource_kinds["capability"]
    assert capability_catalog["default_variant"] == "generic_capability"
    generic_capability = next(
        variant
        for variant in capability_catalog["variants"]
        if variant["variant"] == "generic_capability"
    )
    secret_binding_field = _field_for(generic_capability, "secret_id")
    assert secret_binding_field["control"] == "select"
    assert secret_binding_field["options_source"] == "management_secret_inventory"

    task_catalog = resource_kinds["task"]
    prompt_run = next(
        variant for variant in task_catalog["variants"] if variant["variant"] == "prompt_run"
    )
    task_type_field = _field_for(prompt_run, "task_type")
    assert task_type_field["default_value"] == "prompt_run"
    assert task_type_field["read_only"] is True

    agent_catalog = resource_kinds["agent"]
    task_scoped = next(
        variant for variant in agent_catalog["variants"] if variant["variant"] == "task_scoped"
    )
    scoped_field_keys = {
        field["key"]
        for section in task_scoped["sections"]
        for field in section["fields"]
    }
    assert "allowed_task_types" in scoped_field_keys
    assert "allowed_capability_ids" not in scoped_field_keys
