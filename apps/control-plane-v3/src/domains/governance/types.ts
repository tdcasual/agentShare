export type TokenAccessPolicyMode = 'all_tokens' | 'explicit_tokens';

export interface TokenAccessPolicy {
  readonly mode: TokenAccessPolicyMode;
  readonly token_ids: string[];
}

export interface GovernedSecret {
  readonly id: string;
  readonly display_name: string;
  readonly kind: string;
  readonly provider: string;
  readonly environment?: string | null;
  readonly provider_scopes: string[];
  readonly resource_selector?: string | null;
  readonly metadata: Record<string, unknown>;
  readonly backend_ref: string;
  readonly publication_status: string;
}

export interface GovernedCapability {
  readonly id: string;
  readonly name: string;
  readonly secret_id: string;
  readonly risk_level: string;
  readonly allowed_mode: string;
  readonly lease_ttl_seconds: number;
  readonly approval_mode: 'auto' | 'manual';
  readonly approval_rules: Array<Record<string, unknown>>;
  readonly allowed_audience: string[];
  readonly access_policy: TokenAccessPolicy;
  readonly required_provider?: string | null;
  readonly required_provider_scopes: string[];
  readonly allowed_environments: string[];
  readonly adapter_type: string;
  readonly adapter_config: Record<string, unknown>;
  readonly publication_status: string;
}

export interface SecretCreateInput {
  readonly display_name: string;
  readonly kind: string;
  readonly value: string;
  readonly provider: string;
  readonly environment?: string | null;
  readonly provider_scopes?: string[];
  readonly resource_selector?: string | null;
  readonly metadata?: Record<string, unknown>;
}

export interface CapabilityCreateInput {
  readonly name: string;
  readonly secret_id: string;
  readonly risk_level: string;
  readonly allowed_mode?: string;
  readonly lease_ttl_seconds?: number;
  readonly approval_mode?: 'auto' | 'manual';
  readonly approval_rules?: Array<Record<string, unknown>>;
  readonly allowed_audience?: string[];
  readonly access_policy?: TokenAccessPolicy;
  readonly required_provider?: string | null;
  readonly required_provider_scopes?: string[];
  readonly allowed_environments?: string[];
  readonly adapter_type?: string;
  readonly adapter_config?: Record<string, unknown>;
}
