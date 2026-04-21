export type CapabilityAccessPolicyMode = 'all_access_tokens' | 'selectors';
export type CapabilityAccessSelectorKind = 'access_token' | 'access_token_label';
export type GovernancePublicationStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'expired';

type GovernanceStatusSubject = {
  readonly publication_status?: string | null;
  readonly created_by_actor_type?: string | null;
  readonly reviewed_at?: string | null;
};

export interface CapabilityAccessSelector {
  readonly kind: CapabilityAccessSelectorKind;
  readonly ids?: string[];
  readonly key?: string;
  readonly values?: string[];
}

export interface CapabilityAccessPolicy {
  readonly mode: CapabilityAccessPolicyMode;
  readonly selectors: CapabilityAccessSelector[];
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
  readonly created_by_actor_type?: string | null;
  readonly created_by_actor_id?: string | null;
  readonly created_via_token_id?: string | null;
  readonly reviewed_at?: string | null;
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
  readonly access_policy: CapabilityAccessPolicy;
  readonly required_provider?: string | null;
  readonly required_provider_scopes: string[];
  readonly allowed_environments: string[];
  readonly adapter_type: string;
  readonly adapter_config: Record<string, unknown>;
  readonly publication_status: string;
  readonly created_by_actor_type?: string | null;
  readonly created_by_actor_id?: string | null;
  readonly created_via_token_id?: string | null;
  readonly reviewed_at?: string | null;
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
  readonly access_policy?: CapabilityAccessPolicy;
  readonly required_provider?: string | null;
  readonly required_provider_scopes?: string[];
  readonly allowed_environments?: string[];
  readonly adapter_type?: string;
  readonly adapter_config?: Record<string, unknown>;
}

export function normalizeGovernancePublicationStatus(
  status?: string | null
): GovernancePublicationStatus {
  if (status === 'pending') {
    return 'pending_review';
  }
  if (
    status === 'pending_review' ||
    status === 'approved' ||
    status === 'rejected' ||
    status === 'active' ||
    status === 'expired'
  ) {
    return status;
  }
  return 'active';
}

export function deriveGovernanceStatus(
  subject: GovernanceStatusSubject
): GovernancePublicationStatus {
  const normalized = normalizeGovernancePublicationStatus(subject.publication_status);
  if (normalized === 'active' && subject.created_by_actor_type === 'agent' && subject.reviewed_at) {
    return 'approved';
  }
  return normalized;
}

export function isGovernanceInventoryActive(status: GovernancePublicationStatus) {
  return status === 'active' || status === 'approved';
}

export function governanceStatusLabel(status: GovernancePublicationStatus) {
  switch (status) {
    case 'pending_review':
      return 'Awaiting human review';
    case 'approved':
      return 'Approved by human review';
    case 'rejected':
      return 'Rejected by human review';
    case 'expired':
      return 'Expired';
    default:
      return 'Active';
  }
}

export function governanceStatusTranslationKey(status: GovernancePublicationStatus) {
  switch (status) {
    case 'pending_review':
      return 'governance.status.pendingReview';
    case 'approved':
      return 'governance.status.approved';
    case 'rejected':
      return 'governance.status.rejected';
    case 'expired':
      return 'governance.status.expired';
    default:
      return 'governance.status.active';
  }
}
