// ============================================
// Core Types for Control Plane V3
// Dual Cosmos Architecture
// ============================================

// --- Identity Types ---

export type IdentityType = 'human' | 'agent';

export type IdentityStatus = 'active' | 'inactive' | 'suspended';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface IdentityReference {
  id: string;
  type: IdentityType;
  name: string;
  avatar?: string;
}

export interface IdentityProfile {
  name: string;
  avatar: string;
  bio?: string;
  tags: string[];
  createdAt: Date;
}

export interface HumanProfile extends IdentityProfile {
  email?: string;
  timezone?: string;
  preferences?: HumanPreferences;
}

export interface AgentProfile extends IdentityProfile {
  architecture?: string;
  version?: string;
  provider?: string;
  allowedTaskTypes?: string[];
}

export interface HumanPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  notificationPolicy: NotificationPolicy;
}

export interface NotificationPolicy {
  agentCompletions: boolean;
  agentRequests: boolean;
  systemEvents: boolean;
}

export interface IdentityCapabilities {
  canCreate: AssetType[];
  canExecute: string[];
  maxRiskTier: RiskTier;
  allowedScopes: string[];
}

export interface IdentityRelationships {
  trusts: string[];
  trustedBy: string[];
  delegates: string[];
  delegatedBy: string[];
}

export interface Identity {
  id: string;
  type: IdentityType;
  profile: IdentityProfile;
  credentials: {
    primary: Credential;
    secondary?: Credential[];
  };
  capabilities: IdentityCapabilities;
  status: IdentityStatus;
  presence: PresenceStatus;
  relationships: IdentityRelationships;
}

export interface HumanIdentity extends Identity {
  type: 'human';
  profile: HumanProfile;
  session?: {
    managementRole: ManagementRole;
    lastLoginAt: Date;
    mfaEnabled: boolean;
  };
}

export interface AgentIdentity extends Identity {
  type: 'agent';
  profile: AgentProfile;
  runtime?: AgentRuntime;
  parentId?: string;
}

export interface AgentRuntime {
  adapterType: 'openai' | 'claude' | 'mcp' | 'custom';
  endpoint?: string;
  maxConcurrent: number;
  timeout: number;
}

export interface Credential {
  id: string;
  type: 'api_key' | 'oauth' | 'certificate';
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
}

export type ManagementRole = 'viewer' | 'operator' | 'admin' | 'owner';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

// --- Asset Types ---

export type AssetType = 
  | 'api_key'
  | 'secret'
  | 'certificate'
  | 'task'
  | 'workflow'
  | 'playbook'
  | 'capability'
  | 'tool'
  | 'integration'
  | 'space'
  | 'channel'
  | 'document'
  | 'knowledge_base'
  | 'prompt'
  | 'agent_definition'
  | 'agent_instance';

export interface Asset {
  id: string;
  type: AssetType;
  version: number;
  ownership: AssetOwnership;
  content: AssetContent;
  visibility: VisibilityConfig;
  permissions: PermissionMatrix;
  lifecycle: AssetLifecycle;
  analytics: AssetAnalytics;
  lineage: AssetLineage;
}

export interface AssetOwnership {
  creator: IdentityReference;
  owner: IdentityReference;
  history: OwnershipTransfer[];
}

export interface OwnershipTransfer {
  from: IdentityReference;
  to: IdentityReference;
  timestamp: Date;
  reason?: string;
}

export interface AssetContent {
  name: string;
  description?: string;
  tags: string[];
  data: unknown;
  schema: unknown;
}

export interface AssetLifecycle {
  status: 'draft' | 'active' | 'archived' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  archivedAt?: Date;
}

export interface AssetAnalytics {
  views: number;
  executions: number;
  uniqueUsers: number;
  lastAccessedAt?: Date;
}

export interface AssetLineage {
  parentId?: string;
  forkedFrom?: string;
  versions: string[];
  derivatives: string[];
}

// --- Visibility Types ---

export type Discoverability = 'public' | 'organization' | 'cohort' | 'explicit' | 'secret';

export interface VisibilityConfig {
  discoverability: Discoverability;
  explicitVisibility: {
    identities: string[];
    cohorts: string[];
  };
  accessLevel: {
    default: AccessPermission;
    byIdentity: Record<string, AccessPermission>;
    byRole: Record<string, AccessPermission>;
  };
  inheritance: {
    fromParent: boolean;
    propagateToChildren: boolean;
  };
  temporaryGrants: TemporaryGrant[];
}

export enum AccessPermission {
  NONE = 0,
  DISCOVER = 1 << 0,
  VIEW_METADATA = 1 << 1,
  VIEW_CONTENT = 1 << 2,
  EXECUTE = 1 << 3,
  EDIT = 1 << 4,
  DELETE = 1 << 5,
  SHARE = 1 << 6,
  TRANSFER = 1 << 7,
  ADMIN = (1 << 8) - 1,
}

export interface TemporaryGrant {
  id: string;
  grantee: string;
  permission: AccessPermission;
  grantedBy: string;
  expiresAt: Date;
  used: boolean;
  revoked: boolean;
}

export interface PermissionMatrix {
  [identityId: string]: AccessPermission;
}

// --- Space Types ---

export type SpaceType = 
  | 'direct'
  | 'huddle'
  | 'team'
  | 'channel'
  | 'forum'
  | 'task_room'
  | 'project'
  | 'ai_human_pair'
  | 'swarm';

export interface Space {
  id: string;
  type: SpaceType;
  meta: SpaceMeta;
  participants: SpaceParticipants;
  context: SpaceContext;
  state: SpaceState;
}

// --- Control Plane API Types ---

export interface BootstrapStatus {
  initialized: boolean;
}

export interface ManagementSessionSummary {
  status: string;
  actor_type: string;
  actor_id: string;
  role: ManagementRole;
  auth_method: string;
  session_id: string;
  email: string;
  expires_in: number;
  issued_at: number;
  expires_at: number;
}

export interface AdminAccountSummary {
  id: string;
  email: string;
  display_name: string;
  role: ManagementRole;
  status: string;
  last_login_at: string | null;
}

export interface AgentSummary {
  id: string;
  name: string;
  status: string;
  risk_tier: string;
  auth_method: string;
}

export interface AgentTokenSummary {
  id: string;
  agent_id: string;
  display_name: string;
  token_prefix: string;
  status: string;
  expires_at: string | null;
  issued_by_actor_type: string;
  issued_by_actor_id: string;
  last_used_at: string | null;
  scopes: string[];
  labels: Record<string, string>;
  completed_runs: number;
  successful_runs: number;
  success_rate: number;
  last_feedback_at: string | null;
  trust_score: number;
  api_key?: string | null;
}

export interface ReviewQueueItem {
  resource_kind: string;
  resource_id: string;
  title: string;
  publication_status: string;
  created_by_actor_type: string;
  created_by_actor_id: string;
  created_via_token_id: string | null;
  reviewed_by_actor_id: string | null;
  reviewed_at: string | null;
}

export interface TaskSummary {
  id: string;
  title: string;
  task_type: string;
  input: Record<string, unknown>;
  status: string;
  claimed_by: string | null;
  publication_status: string;
  priority: string;
  created_by_actor_type: string;
  created_by_actor_id: string;
  created_via_token_id: string | null;
  target_ids: string[];
  target_token_ids: string[];
}

export interface RunSummary {
  id: string;
  task_id: string;
  agent_id: string;
  token_id: string | null;
  task_target_id: string | null;
  status: string;
  result_summary: string;
  output_payload: Record<string, unknown>;
  error_summary: string | null;
}

export interface TokenFeedbackSummary {
  id: string;
  token_id: string;
  task_target_id: string;
  run_id: string;
  source: string;
  score: number;
  verdict: string;
  summary: string;
  created_by_actor_type: string;
  created_by_actor_id: string;
  created_at: string;
}

export interface SpaceMeta {
  name: string;
  description?: string;
  createdBy: IdentityReference;
  createdAt: Date;
}

export interface SpaceParticipants {
  identities: SpaceParticipant[];
  maxCount?: number;
}

export interface SpaceParticipant {
  identity: IdentityReference;
  role: SpaceRole;
  joinedAt: Date;
  permissions: string[];
  presence: {
    status: PresenceStatus;
    lastSeenAt: Date;
    currentActivity?: string;
  };
}

export type SpaceRole = 'owner' | 'admin' | 'moderator' | 'contributor' | 'observer' | 'bot';

export interface SpaceContext {
  sharedAssets: string[];
  sharedMemory: MemoryFragment[];
  currentFocus?: string;
}

export interface MemoryFragment {
  id: string;
  type: string;
  content: unknown;
  createdBy: IdentityReference;
  createdAt: Date;
}

export interface SpaceState {
  status: 'active' | 'paused' | 'archived';
  activity: ActivityMetrics;
}

export interface ActivityMetrics {
  messageCount: number;
  lastActivityAt: Date;
}

// --- Task Types ---

export interface Task {
  id: string;
  version: number;
  definition: TaskDefinition;
  lifecycle: TaskLifecycle;
  execution: TaskExecution;
  relations: TaskRelations;
  governance: TaskGovernance;
}

export interface TaskDefinition {
  title: string;
  description?: string;
  type: string;
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  input: {
    schema: unknown;
    required: boolean;
    data?: unknown;
  };
  output: {
    schema: unknown;
    format?: string[];
  };
  constraints: {
    maxAttempts: number;
    timeout: number;
    requiredCapabilities: string[];
    riskLevel: RiskTier;
  };
}

export interface TaskLifecycle {
  status: TaskStatus;
  createdBy: IdentityReference;
  createdAt: Date;
  publishedAt?: Date;
  claimedBy?: IdentityReference;
  claimedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: TaskResult;
}

export type TaskStatus = 
  | 'draft'
  | 'pending'
  | 'published'
  | 'claimed'
  | 'in_progress'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface TaskExecution {
  attempts: Attempt[];
  currentAttempt: number;
}

export interface Attempt {
  id: string;
  executor: IdentityReference;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'success' | 'failure';
  result?: unknown;
  error?: Error;
}

export interface TaskResult {
  success: boolean;
  data?: unknown;
  summary: string;
  executedBy: IdentityReference;
  executedAt: Date;
}

export interface TaskRelations {
  parentTask?: string;
  subTasks: string[];
  relatedAssets: string[];
  playbook?: string;
}

export interface TaskGovernance {
  approvalRequired: boolean;
  approvers?: string[];
  autoApproveIf?: Condition[];
}

export interface Condition {
  type: string;
  params: Record<string, unknown>;
}

// --- Event Types ---

export interface DomainEvents {
  // Identity events
  'identity:created': { identity: Identity };
  'identity:updated': { identityId: string; changes: Partial<Identity> };
  'identity:presence:changed': { identityId: string; presence: PresenceStatus };
  
  // Asset events
  'asset:created': { asset: Asset };
  'asset:updated': { assetId: string; changes: Partial<Asset> };
  'asset:deleted': { assetId: string };
  'asset:accessed': { assetId: string; accessorId: string };
  'asset:transferred': { assetId: string; from: string; to: string };
  
  // Task events
  'task:created': { task: Task };
  'task:published': { taskId: string };
  'task:claimed': { taskId: string; claimerId: string };
  'task:completed': { taskId: string; result: TaskResult };
  'task:failed': { taskId: string; error: Error };
  
  // Space events
  'space:created': { space: Space };
  'space:joined': { spaceId: string; identityId: string };
  'space:left': { spaceId: string; identityId: string };
  'space:signal': { spaceId: string; signal: Signal };
  
  // System events
  'system:error': { error: Error; context: unknown };
}

export interface Signal {
  id: string;
  type: string;
  from: IdentityReference;
  timestamp: number;
  payload: unknown;
}

// --- Utility Types ---

export type Disposable = () => void;

export type EventHandler<T> = (payload: T) => void | Promise<void>;

export interface Error {
  code: string;
  message: string;
  details?: unknown;
}
