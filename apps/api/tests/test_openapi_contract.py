from app.config import Settings
from app.factory import create_app
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

    bootstrap_status_op = schema["paths"]["/api/bootstrap/status"]["get"]
    bootstrap_setup_op = schema["paths"]["/api/bootstrap/setup-owner"]["post"]
    invoke_op = schema["paths"]["/api/capabilities/{capability_id}/invoke"]["post"]
    lease_op = schema["paths"]["/api/capabilities/{capability_id}/lease"]["post"]
    claim_op = schema["paths"]["/api/tasks/{task_id}/claim"]["post"]
    complete_op = schema["paths"]["/api/tasks/{task_id}/complete"]["post"]
    assigned_op = schema["paths"]["/api/tasks/assigned"]["get"]
    claim_target_op = schema["paths"]["/api/task-targets/{target_id}/claim"]["post"]
    complete_target_op = schema["paths"]["/api/task-targets/{target_id}/complete"]["post"]
    feedback_create_op = schema["paths"]["/api/task-targets/{task_target_id}/feedback"]["post"]
    feedback_list_op = schema["paths"]["/api/agent-tokens/{token_id}/feedback"]["get"]
    create_task_op = schema["paths"]["/api/tasks"]["post"]
    intake_catalog_op = schema["paths"]["/api/intake-catalog"]["get"]
    list_agents_op = schema["paths"]["/api/agents"]["get"]
    list_agent_tokens_op = schema["paths"]["/api/agents/{agent_id}/tokens"]["get"]
    create_agent_token_op = schema["paths"]["/api/agents/{agent_id}/tokens"]["post"]
    revoke_agent_token_op = schema["paths"]["/api/agent-tokens/{token_id}/revoke"]["post"]
    login_op = schema["paths"]["/api/session/login"]["post"]
    logout_op = schema["paths"]["/api/session/logout"]["post"]
    list_admin_accounts_op = schema["paths"]["/api/admin-accounts"]["get"]
    create_admin_account_op = schema["paths"]["/api/admin-accounts"]["post"]
    list_approvals_op = schema["paths"]["/api/approvals"]["get"]
    approve_op = schema["paths"]["/api/approvals/{approval_id}/approve"]["post"]
    reject_op = schema["paths"]["/api/approvals/{approval_id}/reject"]["post"]
    list_reviews_op = schema["paths"]["/api/reviews"]["get"]
    approve_review_op = schema["paths"]["/api/reviews/{resource_kind}/{resource_id}/approve"]["post"]
    reject_review_op = schema["paths"]["/api/reviews/{resource_kind}/{resource_id}/reject"]["post"]
    create_secret_op = schema["paths"]["/api/secrets"]["post"]
    create_capability_op = schema["paths"]["/api/capabilities"]["post"]
    create_playbook_op = schema["paths"]["/api/playbooks"]["post"]

    assert bootstrap_status_op["summary"]
    assert bootstrap_status_op["description"]
    assert "security" not in bootstrap_status_op
    assert bootstrap_setup_op["summary"]
    assert bootstrap_setup_op["description"]
    assert "security" not in bootstrap_setup_op
    assert invoke_op["summary"]
    assert invoke_op["description"]
    assert invoke_op["security"] == [{"HTTPBearer": []}]
    assert lease_op["security"] == [{"HTTPBearer": []}]
    assert claim_op["security"] == [{"HTTPBearer": []}]
    assert complete_op["security"] == [{"HTTPBearer": []}]
    assert assigned_op["security"] == [{"HTTPBearer": []}]
    assert claim_target_op["security"] == [{"HTTPBearer": []}]
    assert complete_target_op["security"] == [{"HTTPBearer": []}]
    assert feedback_create_op["security"] == [{"ManagementSession": []}]
    assert feedback_list_op["security"] == [{"ManagementSession": []}]
    assert create_task_op["summary"]
    assert create_task_op["description"]
    assert create_task_op["security"] == [{"HTTPBearer": []}, {"ManagementSession": []}]
    assert "pending-review" in create_task_op["description"].lower()
    assert create_secret_op["security"] == [{"HTTPBearer": []}, {"ManagementSession": []}]
    assert "runtime agents may submit" in create_secret_op["description"].lower()
    assert create_capability_op["security"] == [{"HTTPBearer": []}, {"ManagementSession": []}]
    assert "pending-review capability" in create_capability_op["description"].lower()
    assert create_playbook_op["security"] == [{"HTTPBearer": []}, {"ManagementSession": []}]
    assert "pending-review playbook" in create_playbook_op["description"].lower()
    assert intake_catalog_op["summary"]
    assert intake_catalog_op["description"]
    assert intake_catalog_op["security"] == [{"ManagementSession": []}]
    assert list_agents_op["security"] == [{"ManagementSession": []}]
    assert list_agent_tokens_op["security"] == [{"ManagementSession": []}]
    assert create_agent_token_op["security"] == [{"ManagementSession": []}]
    assert revoke_agent_token_op["security"] == [{"ManagementSession": []}]
    assert list_admin_accounts_op["security"] == [{"ManagementSession": []}]
    assert create_admin_account_op["security"] == [{"ManagementSession": []}]
    assert logout_op["security"] == [{"ManagementSession": []}]
    assert list_approvals_op["security"] == [{"ManagementSession": []}]
    assert approve_op["security"] == [{"ManagementSession": []}]
    assert reject_op["security"] == [{"ManagementSession": []}]
    assert list_reviews_op["security"] == [{"ManagementSession": []}]
    assert approve_review_op["security"] == [{"ManagementSession": []}]
    assert reject_review_op["security"] == [{"ManagementSession": []}]
    assert list_approvals_op["responses"]["200"]["content"]["application/json"]["schema"]["$ref"] == "#/components/schemas/ApprovalListResponse"
    assert "security" not in login_op

    schemas = schema["components"]["schemas"]
    assert schemas["BootstrapStatusResponse"]["properties"]["initialized"]["type"] == "boolean"
    assert schemas["BootstrapOwnerSetupRequest"]["required"] == ["bootstrap_key", "email", "display_name", "password"]
    assert schemas["BootstrapOwnerSetupRequest"]["properties"]["bootstrap_key"]["type"] == "string"
    assert schemas["BootstrapOwnerSetupResponse"]["properties"]["account"]["$ref"] == "#/components/schemas/BootstrapAccountResponse"
    assert schemas["BootstrapAccountResponse"]["properties"]["role"]["type"] == "string"
    assert schemas["ApprovalListResponse"]["properties"]["items"]["type"] == "array"
    assert schemas["ApprovalListResponse"]["properties"]["items"]["items"]["$ref"] == "#/components/schemas/ApprovalResponse"
    assert schemas["IntakeCatalogResponse"]["properties"]["resource_kinds"]["type"] == "array"
    assert schemas["IntakeVariantCatalog"]["properties"]["sections"]["type"] == "array"
    assert schemas["IntakeFieldCatalog"]["properties"]["options_source"]["anyOf"][0]["type"] == "string"
    assert schemas["AgentCreate"]["example"]["allowed_task_types"] == ["config_sync", "account_read"]
    assert schemas["SecretCreate"]["example"]["provider"] == "openai"
    assert schemas["CapabilityCreate"]["example"]["required_provider_scopes"] == ["repo"]
    assert schemas["TaskCreate"]["example"]["required_capability_ids"] == ["capability-1"]
    assert schemas["TaskCreate"]["example"]["target_token_ids"] == ["token-1"]
    assert schemas["TaskCreate"]["example"]["target_mode"] == "explicit_tokens"
    assert schemas["InvokeRequest"]["example"]["task_id"] == "task-1"
    assert schemas["LeaseRequest"]["example"]["purpose"] == "git cli access"
    assert schemas["ManagementLoginRequest"]["example"]["email"] == "owner@example.com"
    assert schemas["ManagementLoginRequest"]["example"]["password"] == "correct horse battery staple"
    assert schemas["AgentTokenCreate"]["example"]["display_name"] == "Staging worker token"
    assert schemas["TokenFeedbackCreate"]["example"]["score"] == 5


def test_openapi_uses_runtime_management_cookie_name_for_docs(tmp_path):
    app = create_app(
        Settings(
            database_url=f"sqlite:///{tmp_path / 'openapi-cookie.db'}",
            management_session_cookie_name="ops_session",
        )
    )

    schema = app.openapi()

    management_scheme = schema["components"]["securitySchemes"]["ManagementSession"]
    assert management_scheme["name"] == "ops_session"
