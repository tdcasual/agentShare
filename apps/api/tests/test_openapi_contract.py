from app.main import app


def test_openapi_declares_agent_runtime_security_and_examples():
    schema = app.openapi()

    assert "/docs" in schema["info"]["description"]
    assert "/openapi.json" in schema["info"]["description"]
    assert "HTTPBearer" in schema["components"]["securitySchemes"]
    assert "ManagementSession" in schema["components"]["securitySchemes"]
    management_scheme = schema["components"]["securitySchemes"]["ManagementSession"]
    assert management_scheme["type"] == "apiKey"
    assert management_scheme["in"] == "cookie"
    assert management_scheme["name"] == "management_session"

    invoke_op = schema["paths"]["/api/capabilities/{capability_id}/invoke"]["post"]
    lease_op = schema["paths"]["/api/capabilities/{capability_id}/lease"]["post"]
    claim_op = schema["paths"]["/api/tasks/{task_id}/claim"]["post"]
    complete_op = schema["paths"]["/api/tasks/{task_id}/complete"]["post"]
    create_task_op = schema["paths"]["/api/tasks"]["post"]
    list_agents_op = schema["paths"]["/api/agents"]["get"]
    login_op = schema["paths"]["/api/session/login"]["post"]
    list_approvals_op = schema["paths"]["/api/approvals"]["get"]
    approve_op = schema["paths"]["/api/approvals/{approval_id}/approve"]["post"]
    reject_op = schema["paths"]["/api/approvals/{approval_id}/reject"]["post"]

    assert invoke_op["summary"]
    assert invoke_op["description"]
    assert invoke_op["security"] == [{"HTTPBearer": []}]
    assert lease_op["security"] == [{"HTTPBearer": []}]
    assert claim_op["security"] == [{"HTTPBearer": []}]
    assert complete_op["security"] == [{"HTTPBearer": []}]
    assert create_task_op["summary"]
    assert create_task_op["description"]
    assert create_task_op["security"] == [{"ManagementSession": []}]
    assert list_agents_op["security"] == [{"ManagementSession": []}]
    assert list_approvals_op["security"] == [{"ManagementSession": []}]
    assert approve_op["security"] == [{"ManagementSession": []}]
    assert reject_op["security"] == [{"ManagementSession": []}]
    assert "security" not in login_op

    schemas = schema["components"]["schemas"]
    assert schemas["AgentCreate"]["example"]["allowed_task_types"] == ["config_sync", "account_read"]
    assert schemas["SecretCreate"]["example"]["provider"] == "openai"
    assert schemas["CapabilityCreate"]["example"]["required_provider_scopes"] == ["repo"]
    assert schemas["TaskCreate"]["example"]["required_capability_ids"] == ["capability-1"]
    assert schemas["InvokeRequest"]["example"]["task_id"] == "task-1"
    assert schemas["LeaseRequest"]["example"]["purpose"] == "git cli access"
    assert schemas["ManagementLoginRequest"]["example"]["bootstrap_key"] == "changeme-bootstrap-key"
