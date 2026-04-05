/**
 * Approval Hooks - 审批领域React Hooks
 */

'use client';

import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr';
import { useCallback, useState, useMemo } from 'react';
import { 
  getApprovals, 
  approveRequest, 
  rejectRequest,
  type ApprovalListResponse 
} from './api';
import type { ApprovalTransportDTO, Approval, ApprovalQuery, ApproveInput, RejectInput } from './types';
import { pollingConfig } from '@/lib/swr-config';

// 转换函数 - 与后端 ApprovalResponse 对齐
function toApprovalModel(dto: ApprovalTransportDTO): Approval {
  return {
    id: dto.id,
    taskId: dto.task_id,
    capabilityId: dto.capability_id,
    agentId: dto.agent_id,
    actionType: dto.action_type,
    status: dto.status,
    reason: dto.reason,
    policyReason: dto.policy_reason,
    policySource: dto.policy_source,
    requestedBy: dto.requested_by,
    decidedBy: dto.decided_by,
    expiresAt: dto.expires_at,
  };
}

// SWR key生成
const getApprovalsKey = (query?: ApprovalQuery) => {
  if (!query) {return '/api/approvals';}
  return ['/api/approvals', query];
};

/**
 * 获取审批列表
 */
export function useApprovals(query?: ApprovalQuery, config?: SWRConfiguration) {
  const { data, error, isLoading, mutate } = useSWR<ApprovalListResponse>(
    getApprovalsKey(query),
    () => getApprovals(query),
    {
      ...pollingConfig,
      ...config,
    }
  );
  
  // 转换DTO到Model
  const approvals = useMemo(() => {
    return (data?.items || []).map(toApprovalModel);
  }, [data?.items]);
  
  return {
    approvals,
    total: approvals.length,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * 审批操作Hook
 */
export function useApprovalActions() {
  const { mutate } = useSWRConfig();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * 批准请求
   */
  const approve = useCallback(async (approvalId: string, input?: ApproveInput) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await approveRequest(approvalId, input);
      // 刷新列表缓存
      await mutate('/api/approvals');
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('批准失败'));
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [mutate]);
  
  /**
   * 拒绝请求
   */
  const reject = useCallback(async (approvalId: string, input: RejectInput) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await rejectRequest(approvalId, input);
      // 刷新列表缓存
      await mutate('/api/approvals');
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('拒绝失败'));
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [mutate]);
  
  return {
    approve,
    reject,
    isProcessing,
    error,
  };
}


