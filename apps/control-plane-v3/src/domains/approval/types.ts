/**
 * Approval Domain Types - 审批领域类型
 *
 * 与后端 /api/approvals 对齐
 * 后端返回字段: id, task_id, capability_id, agent_id, action_type, status, reason,
 *              policy_reason, policy_source, requested_by, decided_by, expires_at
 */


export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type ApprovalActionType = 'invoke' | 'lease';


export interface ApprovalTransportDTO {
  readonly id: string;
  readonly task_id: string;
  readonly capability_id: string;
  readonly agent_id: string;
  readonly action_type: ApprovalActionType;
  readonly status: ApprovalStatus;
  readonly reason: string;
  readonly policy_reason: string;
  readonly policy_source: string | null;
  readonly requested_by: string;
  readonly decided_by: string | null;
  readonly expires_at: string | null;
}


export interface Approval {
  readonly id: string;
  readonly taskId: string;
  readonly capabilityId: string;
  readonly agentId: string;
  readonly actionType: ApprovalActionType;
  readonly status: ApprovalStatus;
  readonly reason: string;
  readonly policyReason: string;
  readonly policySource: string | null;
  readonly requestedBy: string;
  readonly decidedBy: string | null;
  readonly expiresAt: string | null;
}


export interface ApprovalQuery {
  readonly status?: ApprovalStatus;
}


export interface ApproveInput {
  readonly reason?: string;
}

export interface RejectInput {
  readonly reason: string;
}
