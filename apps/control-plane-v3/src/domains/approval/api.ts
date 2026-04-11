/**
 * Approval API - 审批领域API
 */

import { apiFetch } from '@/lib/api-client';
import type { ApprovalTransportDTO, ApprovalQuery, ApproveInput, RejectInput } from './types';

const BASE_URL = '/approvals';

export interface ApprovalListResponse {
  items: ApprovalTransportDTO[];
}

/**
 * 获取审批列表
 */
export async function getApprovals(query?: ApprovalQuery): Promise<ApprovalListResponse> {
  const params = new URLSearchParams();
  if (query?.status) {
    params.set('status', query.status);
  }

  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

  return apiFetch(url);
}

/**
 * 批准请求
 */
export async function approveRequest(
  approvalId: string,
  input?: ApproveInput
): Promise<ApprovalTransportDTO> {
  return apiFetch(`${BASE_URL}/${approvalId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input || {}),
  });
}

/**
 * 拒绝请求
 */
export async function rejectRequest(
  approvalId: string,
  input: RejectInput
): Promise<ApprovalTransportDTO> {
  return apiFetch(`${BASE_URL}/${approvalId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

// API对象（用于统一导出）
export const approvalApi = {
  getApprovals,
  approveRequest,
  rejectRequest,
};
