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
    assert {variant["variant"] for variant in secret_catalog["variants"]} == {
        "generic_secret",
        "openai_api_token",
        "github_pat",
        "cookie_session",
        "refresh_token",
    }
    openai_secret = next(
        variant for variant in secret_catalog["variants"] if variant["variant"] == "openai_api_token"
    )
    provider_field = _field_for(openai_secret, "provider")
    assert provider_field["default_value"] == "openai"
    assert provider_field["read_only"] is True
    kind_field = _field_for(openai_secret, "kind")
    assert kind_field["default_value"] == "api_token"
    assert kind_field["read_only"] is True
    secret_metadata_field = _field_for(openai_secret, "metadata")
    assert secret_metadata_field["advanced"] is True

    capability_catalog = resource_kinds["capability"]
    assert capability_catalog["default_variant"] == "generic_capability"
    assert {variant["variant"] for variant in capability_catalog["variants"]} == {
        "generic_capability",
        "openai_chat_proxy",
        "github_rest_proxy",
        "lease_enabled_generic_http",
    }
    generic_capability = next(
        variant
        for variant in capability_catalog["variants"]
        if variant["variant"] == "generic_capability"
    )
    secret_binding_field = _field_for(generic_capability, "secret_id")
    assert secret_binding_field["control"] == "select"
    assert secret_binding_field["options_source"] == "management_secret_inventory"
    openai_capability = next(
        variant
        for variant in capability_catalog["variants"]
        if variant["variant"] == "openai_chat_proxy"
    )
    adapter_type_field = _field_for(openai_capability, "adapter_type")
    assert adapter_type_field["default_value"] == "openai"
    assert adapter_type_field["read_only"] is True
    required_provider_field = _field_for(openai_capability, "required_provider")
    assert required_provider_field["default_value"] == "openai"
    assert required_provider_field["read_only"] is True

    task_catalog = resource_kinds["task"]
    assert {variant["variant"] for variant in task_catalog["variants"]} == {
        "custom_task",
        "prompt_run",
        "config_sync",
        "account_read",
    }
    prompt_run = next(
        variant for variant in task_catalog["variants"] if variant["variant"] == "prompt_run"
    )
    task_type_field = _field_for(prompt_run, "task_type")
    assert task_type_field["default_value"] == "prompt_run"
    assert task_type_field["read_only"] is True
    prompt_input_field = _field_for(prompt_run, "input")
    assert prompt_input_field["default_value"] == '{"provider":"openai"}'
    lease_allowed_field = _field_for(prompt_run, "lease_allowed")
    assert lease_allowed_field["default_value"] == "false"

    agent_catalog = resource_kinds["agent"]
    assert {variant["variant"] for variant in agent_catalog["variants"]} == {
        "general_agent",
        "task_scoped",
        "capability_scoped",
        "fully_scoped",
    }
    task_scoped = next(
        variant for variant in agent_catalog["variants"] if variant["variant"] == "task_scoped"
    )
    scoped_field_keys = {
        field["key"]
        for section in task_scoped["sections"]
        for field in section["fields"]
    }
    risk_tier_field = _field_for(task_scoped, "risk_tier")
    assert risk_tier_field["default_value"] == "medium"
    assert "allowed_task_types" in scoped_field_keys
    assert "allowed_capability_ids" not in scoped_field_keys
