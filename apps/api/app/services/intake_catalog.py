from __future__ import annotations

from app.schemas.intake_catalog import (
    IntakeCatalogResponse,
    IntakeFieldCatalog,
    IntakeFieldOptionCatalog,
    IntakeResourceCatalog,
    IntakeSectionCatalog,
    IntakeVariantCatalog,
    LocalizedText,
)


def text(en: str, zh: str) -> LocalizedText:
    return LocalizedText(en=en, zh=zh)


def option(value: str, en: str, zh: str) -> IntakeFieldOptionCatalog:
    return IntakeFieldOptionCatalog(value=value, label=text(en, zh))


def field(
    key: str,
    control: str,
    label_en: str,
    label_zh: str,
    *,
    description: tuple[str, str] | None = None,
    placeholder: tuple[str, str] | None = None,
    default_value: str | bool | None = None,
    required: bool = False,
    advanced: bool = False,
    read_only: bool = False,
    options: list[IntakeFieldOptionCatalog] | None = None,
    options_source: str | None = None,
) -> IntakeFieldCatalog:
    return IntakeFieldCatalog(
        key=key,
        control=control,
        label=text(label_en, label_zh),
        description=text(*description) if description else None,
        placeholder=text(*placeholder) if placeholder else None,
        default_value=default_value,
        required=required,
        advanced=advanced,
        read_only=read_only,
        options=options or [],
        options_source=options_source,
    )


def section(
    section_id: str,
    title_en: str,
    title_zh: str,
    fields: list[IntakeFieldCatalog],
    *,
    description: tuple[str, str] | None = None,
) -> IntakeSectionCatalog:
    return IntakeSectionCatalog(
        id=section_id,
        title=text(title_en, title_zh),
        description=text(*description) if description else None,
        fields=fields,
    )


def variant(
    resource_kind: str,
    variant_id: str,
    title_en: str,
    title_zh: str,
    summary_en: str,
    summary_zh: str,
    sections: list[IntakeSectionCatalog],
) -> IntakeVariantCatalog:
    return IntakeVariantCatalog(
        resource_kind=resource_kind,
        variant=variant_id,
        title=text(title_en, title_zh),
        summary=text(summary_en, summary_zh),
        sections=sections,
    )


SECRET_KIND_OPTIONS = [
    option("api_token", "API token", "API token"),
    option("cookie", "Cookie", "Cookie"),
    option("refresh_token", "Refresh token", "刷新 token"),
]

MODE_OPTIONS = [
    option("proxy_only", "Proxy only", "仅代理"),
    option("proxy_or_lease", "Proxy or lease", "代理或租约"),
]

RISK_OPTIONS = [
    option("low", "Low", "低"),
    option("medium", "Medium", "中"),
    option("high", "High", "高"),
]

APPROVAL_OPTIONS = [
    option("auto", "Auto", "自动"),
    option("manual", "Manual review", "人工复核"),
]

LEASE_POLICY_OPTIONS = [
    option("false", "Proxy only", "仅代理"),
    option("true", "Lease allowed", "允许租约"),
]

ADAPTER_TYPE_OPTIONS = [
    option("generic_http", "generic_http", "generic_http"),
    option("openai", "openai", "openai"),
    option("github", "github", "github"),
]


def build_secret_catalog() -> IntakeResourceCatalog:
    variants = [
        variant(
            "secret",
            "generic_secret",
            "Generic secret",
            "通用密钥",
            "Manual entry with full control over kind and provider.",
            "手动录入，完整控制类型与提供方。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field(
                            "display_name",
                            "text",
                            "Display name",
                            "显示名称",
                            placeholder=("OpenAI production key", "OpenAI 生产访问密钥"),
                            required=True,
                        ),
                        field("kind", "select", "Kind", "类型", default_value="api_token", required=True, options=SECRET_KIND_OPTIONS),
                        field(
                            "value",
                            "password",
                            "Secret value",
                            "密钥内容",
                            placeholder=("Paste the secret here", "在这里粘贴密钥"),
                            required=True,
                        ),
                        field("provider", "text", "Provider", "服务提供方", placeholder=("openai", "openai"), required=True),
                        field("environment", "text", "Environment", "环境", placeholder=("production", "production")),
                        field(
                            "provider_scopes",
                            "chips",
                            "Provider scopes",
                            "权限范围",
                            placeholder=("responses.read,responses.write", "responses.read,responses.write"),
                        ),
                        field("resource_selector", "text", "Resource selector", "资源选择器", placeholder=("org:core", "org:core")),
                        field("metadata", "json", "Metadata (JSON)", "元数据（JSON）", default_value='{"owner":"platform"}', advanced=True),
                    ],
                )
            ],
        ),
        variant(
            "secret",
            "openai_api_token",
            "OpenAI API token",
            "OpenAI API token",
            "Preset for OpenAI token intake with guided scopes.",
            "为 OpenAI token 提供带默认范围的录入模板。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("display_name", "text", "Display name", "显示名称", placeholder=("OpenAI production key", "OpenAI 生产访问密钥"), required=True),
                        field("value", "password", "Secret value", "密钥内容", placeholder=("Paste the secret here", "在这里粘贴密钥"), required=True),
                        field("provider", "text", "Provider", "服务提供方", default_value="openai", read_only=True, required=True),
                        field("kind", "text", "Kind", "类型", default_value="api_token", read_only=True, required=True),
                        field("environment", "text", "Environment", "环境", placeholder=("production", "production")),
                        field("provider_scopes", "chips", "Provider scopes", "权限范围", default_value="responses.read,responses.write"),
                        field("resource_selector", "text", "Resource selector", "资源选择器", placeholder=("org:core", "org:core")),
                        field("metadata", "json", "Metadata (JSON)", "元数据（JSON）", default_value='{"owner":"platform"}', advanced=True),
                    ],
                )
            ],
        ),
        variant(
            "secret",
            "github_pat",
            "GitHub PAT",
            "GitHub PAT",
            "Preset for GitHub personal access tokens.",
            "为 GitHub 个人访问 token 提供模板。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("display_name", "text", "Display name", "显示名称", placeholder=("GitHub repo automation token", "GitHub 仓库自动化 token"), required=True),
                        field("value", "password", "Secret value", "密钥内容", placeholder=("Paste the secret here", "在这里粘贴密钥"), required=True),
                        field("provider", "text", "Provider", "服务提供方", default_value="github", read_only=True, required=True),
                        field("kind", "text", "Kind", "类型", default_value="api_token", read_only=True, required=True),
                        field("environment", "text", "Environment", "环境", placeholder=("production", "production")),
                        field("provider_scopes", "chips", "Provider scopes", "权限范围", default_value="repo:read"),
                        field("resource_selector", "text", "Resource selector", "资源选择器", placeholder=("repo:agent-share", "repo:agent-share")),
                        field("metadata", "json", "Metadata (JSON)", "元数据（JSON）", default_value='{"owner":"platform"}', advanced=True),
                    ],
                )
            ],
        ),
        variant(
            "secret",
            "cookie_session",
            "Cookie session",
            "Cookie 会话",
            "Store a cookie-based session secret with provider metadata.",
            "存储基于 Cookie 的会话凭据与提供方元信息。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("display_name", "text", "Display name", "显示名称", required=True),
                        field("value", "password", "Secret value", "密钥内容", required=True),
                        field("provider", "text", "Provider", "服务提供方", required=True),
                        field("kind", "text", "Kind", "类型", default_value="cookie", read_only=True, required=True),
                        field("environment", "text", "Environment", "环境"),
                        field("resource_selector", "text", "Resource selector", "资源选择器"),
                        field("metadata", "json", "Metadata (JSON)", "元数据（JSON）", default_value='{"owner":"platform"}', advanced=True),
                    ],
                )
            ],
        ),
        variant(
            "secret",
            "refresh_token",
            "Refresh token",
            "刷新 token",
            "Store a refresh token with provider and environment metadata.",
            "存储带提供方与环境信息的刷新 token。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("display_name", "text", "Display name", "显示名称", required=True),
                        field("value", "password", "Secret value", "密钥内容", required=True),
                        field("provider", "text", "Provider", "服务提供方", required=True),
                        field("kind", "text", "Kind", "类型", default_value="refresh_token", read_only=True, required=True),
                        field("environment", "text", "Environment", "环境"),
                        field("resource_selector", "text", "Resource selector", "资源选择器"),
                        field("metadata", "json", "Metadata (JSON)", "元数据（JSON）", default_value='{"owner":"platform"}', advanced=True),
                    ],
                )
            ],
        ),
    ]
    return IntakeResourceCatalog(kind="secret", default_variant="generic_secret", variants=variants)


def build_capability_catalog() -> IntakeResourceCatalog:
    def secret_select_field() -> IntakeFieldCatalog:
        return field(
            "secret_id",
            "select",
            "Bound secret",
            "绑定密钥",
            required=True,
            options_source="management_secret_inventory",
        )

    variants = [
        variant(
            "capability",
            "generic_capability",
            "Generic capability",
            "通用能力",
            "Manual binding with full adapter and provider control.",
            "手动绑定，完整控制适配器与提供方。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("name", "text", "Capability name", "能力名称", required=True),
                        secret_select_field(),
                        field("allowed_mode", "select", "Allowed mode", "允许模式", default_value="proxy_only", required=True, options=MODE_OPTIONS),
                        field("risk_level", "select", "Risk level", "风险等级", default_value="medium", required=True, options=RISK_OPTIONS),
                        field("lease_ttl_seconds", "number", "Lease TTL", "租约时长（秒）", default_value="60", required=True),
                        field("adapter_type", "select", "Adapter type", "适配器类型", default_value="generic_http", required=True, options=ADAPTER_TYPE_OPTIONS),
                        field("required_provider", "text", "Required provider", "要求的服务提供方", required=True),
                        field("approval_mode", "select", "Approval mode", "审批模式", default_value="auto", required=True, options=APPROVAL_OPTIONS),
                        field("adapter_config", "json", "Adapter config JSON", "适配器配置 JSON", default_value="{}", advanced=True),
                        field("approval_rules", "json", "Policy rules JSON", "策略规则 JSON", default_value="[]", advanced=True),
                        field("required_provider_scopes", "chips", "Required provider scopes", "要求的服务提供方权限", advanced=True),
                        field("allowed_environments", "chips", "Allowed environments", "允许环境", advanced=True),
                    ],
                )
            ],
        ),
        variant(
            "capability",
            "openai_chat_proxy",
            "OpenAI chat proxy",
            "OpenAI 聊天代理能力",
            "Preset for OpenAI-backed proxy execution.",
            "面向 OpenAI 代理执行的预设模板。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("name", "text", "Capability name", "能力名称", default_value="openai.chat.invoke", required=True),
                        secret_select_field(),
                        field("allowed_mode", "select", "Allowed mode", "允许模式", default_value="proxy_only", required=True, options=MODE_OPTIONS),
                        field("risk_level", "select", "Risk level", "风险等级", default_value="medium", required=True, options=RISK_OPTIONS),
                        field("lease_ttl_seconds", "number", "Lease TTL", "租约时长（秒）", default_value="60", required=True),
                        field("adapter_type", "text", "Adapter type", "适配器类型", default_value="openai", read_only=True, required=True),
                        field("required_provider", "text", "Required provider", "要求的服务提供方", default_value="openai", read_only=True, required=True),
                        field("approval_mode", "select", "Approval mode", "审批模式", default_value="auto", required=True, options=APPROVAL_OPTIONS),
                        field("required_provider_scopes", "chips", "Required provider scopes", "要求的服务提供方权限", default_value="responses.read", advanced=True),
                        field("allowed_environments", "chips", "Allowed environments", "允许环境", default_value="production", advanced=True),
                        field("adapter_config", "json", "Adapter config JSON", "适配器配置 JSON", default_value="{}", advanced=True),
                        field("approval_rules", "json", "Policy rules JSON", "策略规则 JSON", default_value="[]", advanced=True),
                    ],
                )
            ],
        ),
        variant(
            "capability",
            "github_rest_proxy",
            "GitHub REST proxy",
            "GitHub REST 代理能力",
            "Preset for GitHub repository-scoped proxy operations.",
            "面向 GitHub 仓库范围代理操作的预设模板。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("name", "text", "Capability name", "能力名称", default_value="github.repo.sync", required=True),
                        secret_select_field(),
                        field("allowed_mode", "select", "Allowed mode", "允许模式", default_value="proxy_or_lease", required=True, options=MODE_OPTIONS),
                        field("risk_level", "select", "Risk level", "风险等级", default_value="medium", required=True, options=RISK_OPTIONS),
                        field("lease_ttl_seconds", "number", "Lease TTL", "租约时长（秒）", default_value="180", required=True),
                        field("adapter_type", "text", "Adapter type", "适配器类型", default_value="github", read_only=True, required=True),
                        field("required_provider", "text", "Required provider", "要求的服务提供方", default_value="github", read_only=True, required=True),
                        field("approval_mode", "select", "Approval mode", "审批模式", default_value="auto", required=True, options=APPROVAL_OPTIONS),
                        field("required_provider_scopes", "chips", "Required provider scopes", "要求的服务提供方权限", default_value="repo:read", advanced=True),
                        field("allowed_environments", "chips", "Allowed environments", "允许环境", default_value="production", advanced=True),
                        field("adapter_config", "json", "Adapter config JSON", "适配器配置 JSON", default_value='{"method":"GET","path":"/repos/{owner}/{repo}/issues"}', advanced=True),
                        field("approval_rules", "json", "Policy rules JSON", "策略规则 JSON", default_value="[]", advanced=True),
                    ],
                )
            ],
        ),
        variant(
            "capability",
            "lease_enabled_generic_http",
            "Lease-enabled generic HTTP",
            "允许租约的通用 HTTP 能力",
            "Generic HTTP contract that starts with lease support enabled.",
            "默认启用租约能力的通用 HTTP 契约。",
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("name", "text", "Capability name", "能力名称", required=True),
                        secret_select_field(),
                        field("allowed_mode", "text", "Allowed mode", "允许模式", default_value="proxy_or_lease", read_only=True, required=True),
                        field("risk_level", "select", "Risk level", "风险等级", default_value="medium", required=True, options=RISK_OPTIONS),
                        field("lease_ttl_seconds", "number", "Lease TTL", "租约时长（秒）", default_value="120", required=True),
                        field("adapter_type", "text", "Adapter type", "适配器类型", default_value="generic_http", read_only=True, required=True),
                        field("required_provider", "text", "Required provider", "要求的服务提供方", required=True),
                        field("approval_mode", "select", "Approval mode", "审批模式", default_value="auto", required=True, options=APPROVAL_OPTIONS),
                        field("adapter_config", "json", "Adapter config JSON", "适配器配置 JSON", default_value="{}", advanced=True),
                        field("approval_rules", "json", "Policy rules JSON", "策略规则 JSON", default_value="[]", advanced=True),
                        field("required_provider_scopes", "chips", "Required provider scopes", "要求的服务提供方权限", advanced=True),
                        field("allowed_environments", "chips", "Allowed environments", "允许环境", advanced=True),
                    ],
                )
            ],
        ),
    ]
    return IntakeResourceCatalog(kind="capability", default_variant="generic_capability", variants=variants)


def build_task_catalog() -> IntakeResourceCatalog:
    def task_variant(
        variant_id: str,
        title_en: str,
        title_zh: str,
        summary_en: str,
        summary_zh: str,
        default_task_type: str,
        default_input: str,
        *,
        read_only_task_type: bool = False,
    ) -> IntakeVariantCatalog:
        return variant(
            "task",
            variant_id,
            title_en,
            title_zh,
            summary_en,
            summary_zh,
            [
                section(
                    "basic",
                    "Basic fields",
                    "基础字段",
                    [
                        field("title", "text", "Title", "标题", required=True),
                        field("task_type", "text", "Task type", "任务类型", default_value=default_task_type, required=True, read_only=read_only_task_type),
                        field("lease_allowed", "select", "Lease policy", "租约策略", default_value="false", required=True, options=LEASE_POLICY_OPTIONS),
                        field("approval_mode", "select", "Approval mode", "审批模式", default_value="auto", required=True, options=APPROVAL_OPTIONS),
                        field("input", "json", "Input", "输入", default_value=default_input, required=True),
                        field("approval_rules", "json", "Policy rules JSON", "策略规则 JSON", default_value="[]", advanced=True),
                        field("playbook_ids", "chips", "Referenced playbooks", "关联手册", advanced=True),
                    ],
                )
            ],
        )

    variants = [
        task_variant("custom_task", "Custom task", "自定义任务", "Free-form task intake with full control over task type.", "自由录入，完整控制任务类型。", "", '{"provider":"qq"}'),
        task_variant("prompt_run", "Prompt run", "Prompt run", "Preset for prompt-oriented execution tasks.", "面向 prompt 执行任务的预设模板。", "prompt_run", '{"provider":"openai"}', read_only_task_type=True),
        task_variant("config_sync", "Config sync", "配置同步", "Preset for synchronizing provider or environment configuration.", "面向配置同步任务的预设模板。", "config_sync", '{"provider":"github"}', read_only_task_type=True),
        task_variant("account_read", "Account read", "账号读取", "Preset for read-only account inspection or reporting tasks.", "面向只读账号检查与报表的预设模板。", "account_read", '{"provider":"github"}', read_only_task_type=True),
    ]
    return IntakeResourceCatalog(kind="task", default_variant="custom_task", variants=variants)


def build_agent_catalog() -> IntakeResourceCatalog:
    def agent_variant(
        variant_id: str,
        title_en: str,
        title_zh: str,
        summary_en: str,
        summary_zh: str,
        *,
        include_task_scope: bool = False,
        include_capability_scope: bool = False,
    ) -> IntakeVariantCatalog:
        fields = [
            field("name", "text", "Name", "名称", required=True),
            field("risk_tier", "select", "Risk tier", "风险等级", default_value="medium", required=True, options=RISK_OPTIONS),
        ]
        if include_task_scope:
            fields.append(field("allowed_task_types", "chips", "Allowed task types", "允许的任务类型"))
        if include_capability_scope:
            fields.append(field("allowed_capability_ids", "chips", "Allowed capability IDs", "允许的能力 ID"))

        return variant(
            "agent",
            variant_id,
            title_en,
            title_zh,
            summary_en,
            summary_zh,
            [section("basic", "Basic fields", "基础字段", fields)],
        )

    variants = [
        agent_variant("general_agent", "General agent", "通用 Agent", "Minimal onboarding with name and risk tier only.", "只包含名称与风险等级的最小化注册。"),
        agent_variant("task_scoped", "Task-scoped agent", "任务范围 Agent", "Agent preset with a task-type allowlist.", "带任务类型白名单的 Agent 模板。", include_task_scope=True),
        agent_variant("capability_scoped", "Capability-scoped agent", "能力范围 Agent", "Agent preset with an allowed capability list.", "带能力白名单的 Agent 模板。", include_capability_scope=True),
        agent_variant("fully_scoped", "Fully scoped agent", "双范围 Agent", "Agent preset with both task and capability restrictions.", "同时限制任务与能力范围的 Agent 模板。", include_task_scope=True, include_capability_scope=True),
    ]
    return IntakeResourceCatalog(kind="agent", default_variant="general_agent", variants=variants)


def get_intake_catalog() -> IntakeCatalogResponse:
    return IntakeCatalogResponse(
        resource_kinds=[
            build_secret_catalog(),
            build_capability_catalog(),
            build_task_catalog(),
            build_agent_catalog(),
        ]
    )
