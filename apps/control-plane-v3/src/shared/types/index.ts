/**
 * Shared Types for VaultGate
 */

// ============================================
// VaultGate Core Types
// ============================================

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

/** Role union shared between DTO and domain model */
export type ManagementRole = 'viewer' | 'operator' | 'admin' | 'owner';
