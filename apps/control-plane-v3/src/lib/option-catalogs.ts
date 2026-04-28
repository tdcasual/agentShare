export interface OptionCatalogItem {
  value: string;
  labelKey: string;
  descriptionKey?: string;
}

export const TASK_TYPE_OPTIONS = [
  { value: 'account_read', labelKey: 'options.taskTypes.accountRead' },
  { value: 'config_sync', labelKey: 'options.taskTypes.configSync' },
  { value: 'prompt_run', labelKey: 'options.taskTypes.promptRun' },
  { value: 'analysis', labelKey: 'options.taskTypes.analysis' },
  { value: 'deployment', labelKey: 'options.taskTypes.deployment' },
] as const satisfies readonly OptionCatalogItem[];

export const TASK_PRIORITY_OPTIONS = [
  { value: 'low', labelKey: 'options.priorities.low' },
  { value: 'normal', labelKey: 'options.priorities.normal' },
  { value: 'high', labelKey: 'options.priorities.high' },
  { value: 'critical', labelKey: 'options.priorities.critical' },
] as const satisfies readonly OptionCatalogItem[];

export const SECRET_KIND_OPTIONS = [
  { value: 'api_token', labelKey: 'options.secretKinds.apiToken' },
  { value: 'oauth_token', labelKey: 'options.secretKinds.oauthToken' },
  { value: 'webhook_secret', labelKey: 'options.secretKinds.webhookSecret' },
  { value: 'ssh_key', labelKey: 'options.secretKinds.sshKey' },
  { value: 'password', labelKey: 'options.secretKinds.password' },
] as const satisfies readonly OptionCatalogItem[];

export const PROVIDER_OPTIONS = [
  { value: 'openai', labelKey: 'options.providers.openai' },
  { value: 'anthropic', labelKey: 'options.providers.anthropic' },
  { value: 'deepseek', labelKey: 'options.providers.deepseek' },
  { value: 'github', labelKey: 'options.providers.github' },
  { value: 'generic_http', labelKey: 'options.providers.genericHttp' },
] as const satisfies readonly OptionCatalogItem[];

export const ENVIRONMENT_OPTIONS = [
  { value: 'development', labelKey: 'options.environments.development' },
  { value: 'staging', labelKey: 'options.environments.staging' },
  { value: 'production', labelKey: 'options.environments.production' },
] as const satisfies readonly OptionCatalogItem[];

export const AGENT_MODEL_OPTIONS = [
  { value: '', labelKey: 'options.agentModels.default' },
  { value: 'gpt-5.4', labelKey: 'options.agentModels.gpt54' },
  { value: 'gpt-5', labelKey: 'options.agentModels.gpt5' },
  { value: 'gpt-5-mini', labelKey: 'options.agentModels.gpt5Mini' },
] as const satisfies readonly OptionCatalogItem[];

export const THINKING_LEVEL_OPTIONS = [
  { value: 'low', labelKey: 'options.thinkingLevels.low' },
  { value: 'balanced', labelKey: 'options.thinkingLevels.balanced' },
  { value: 'high', labelKey: 'options.thinkingLevels.high' },
] as const satisfies readonly OptionCatalogItem[];

export const SANDBOX_MODE_OPTIONS = [
  { value: 'workspace-write', labelKey: 'options.sandboxModes.workspaceWrite' },
  { value: 'read-only', labelKey: 'options.sandboxModes.readOnly' },
] as const satisfies readonly OptionCatalogItem[];

export const DEFAULT_AUTH_METHOD = 'openclaw_session';

export const AUTH_METHOD_OPTIONS = [
  { value: DEFAULT_AUTH_METHOD, labelKey: 'options.authMethods.openclawSession' },
  { value: 'access_token', labelKey: 'options.authMethods.accessToken' },
] as const satisfies readonly OptionCatalogItem[];

export const allOptionCatalogs = {
  taskTypes: TASK_TYPE_OPTIONS,
  taskPriorities: TASK_PRIORITY_OPTIONS,
  secretKinds: SECRET_KIND_OPTIONS,
  providers: PROVIDER_OPTIONS,
  environments: ENVIRONMENT_OPTIONS,
  agentModels: AGENT_MODEL_OPTIONS,
  thinkingLevels: THINKING_LEVEL_OPTIONS,
  sandboxModes: SANDBOX_MODE_OPTIONS,
  authMethods: AUTH_METHOD_OPTIONS,
} as const;
