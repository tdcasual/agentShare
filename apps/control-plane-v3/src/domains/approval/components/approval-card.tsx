/**
 * Approval Card - 审批卡片组件
 * 
 * Kawaii风格，带状态徽章和操作按钮
 * 与后端 /api/approvals 返回的 ApprovalResponse 对齐
 */

'use client';

import { useState } from 'react';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import type { Approval, ApprovalStatus } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Bot,
  FileText,
  Shield
} from 'lucide-react';

interface ApprovalCardProps {
  approval: Approval;
  onApprove: (id: string, comment?: string) => Promise<void>;
  onReject: (id: string, reason: string, comment?: string) => Promise<void>;
  isProcessing?: boolean;
}

// 扩展状态配置以包含 expired
const statusConfig: Record<ApprovalStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { 
    label: '待审批', 
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  },
  approved: { 
    label: '已批准', 
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  },
  rejected: { 
    label: '已拒绝', 
    icon: <XCircle className="w-4 h-4" />,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  },
  expired: { 
    label: '已过期', 
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  },
};

// 操作类型显示
const actionTypeLabels: Record<string, string> = {
  invoke: '调用',
  lease: '租赁',
};

export function ApprovalCard({ 
  approval, 
  onApprove, 
  onReject,
  isProcessing = false 
}: ApprovalCardProps) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [localProcessing, setLocalProcessing] = useState(false);
  
  const status = statusConfig[approval.status];
  const isPending = approval.status === 'pending';
  
  const handleApprove = async () => {
    setLocalProcessing(true);
    try {
      await onApprove(approval.id);
    } finally {
      setLocalProcessing(false);
    }
  };
  
  const handleReject = async () => {
    if (!rejectReason.trim()) {return;}
    setLocalProcessing(true);
    try {
      await onReject(approval.id, rejectReason);
      setShowRejectForm(false);
      setRejectReason('');
    } finally {
      setLocalProcessing(false);
    }
  };
  
  return (
    <Card variant="kawaii" className="relative overflow-hidden">
      {/* 状态指示条 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        approval.status === 'pending' ? 'bg-yellow-400' :
        approval.status === 'approved' ? 'bg-green-400' : 
        approval.status === 'expired' ? 'bg-gray-400' : 'bg-red-400'
      }`} />
      
      <div className="pl-4">
        {/* 头部：操作类型和状态 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-pink-500" />
            <span className="font-medium text-gray-800 dark:text-gray-100">
              {actionTypeLabels[approval.actionType] || approval.actionType}
            </span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
            {status.icon}
            {status.label}
          </span>
        </div>
        
        {/* Capability 信息 */}
        <div className="mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Capability: <span className="font-medium">{approval.capabilityId}</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Task: {approval.taskId}
          </p>
        </div>
        
        {/* Agent 信息 */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div className="flex items-center gap-1">
            <Bot className="w-4 h-4" />
            <span>{approval.agentId}</span>
          </div>
          {approval.expiresAt && (
            <div className="flex items-center gap-1 text-xs">
              <Shield className="w-3 h-3" />
              <span>过期: {new Date(approval.expiresAt).toLocaleString()}</span>
            </div>
          )}
        </div>
        
        {/* Policy 原因 */}
        {approval.policyReason && (
          <div className="mb-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">策略原因:</span> {approval.policyReason}
            </p>
            {approval.policySource && (
              <p className="text-xs text-gray-500 mt-1">
                来源: {approval.policySource}
              </p>
            )}
          </div>
        )}
        
        {/* 申请理由 */}
        {approval.reason && (
          <div className="mb-4 p-3 bg-pink-50/50 dark:bg-pink-900/10 rounded-xl">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">申请理由:</span> {approval.reason}
            </p>
          </div>
        )}
        
        {/* 操作按钮（仅pending状态） */}
        {isPending && (
          <div className="flex gap-3">
            {!showRejectForm ? (
              <>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleApprove}
                  disabled={isProcessing || localProcessing}
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  className="flex-1"
                >
                  批准
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isProcessing || localProcessing}
                  leftIcon={<XCircle className="w-4 h-4" />}
                  className="flex-1"
                >
                  拒绝
                </Button>
              </>
            ) : (
              <div className="flex-1 space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请输入拒绝原因..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-pink-200 dark:border-[#3D3D5C] bg-white dark:bg-[#1A1A2E] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejectForm(false)}
                    disabled={localProcessing}
                    className="flex-1"
                  >
                    取消
                  </Button>
                  <Button
                    variant="kawaii"
                    size="sm"
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || localProcessing}
                    className="flex-1"
                  >
                    确认拒绝
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* 已处理信息 */}
        {!isPending && approval.decidedBy && (
          <div className="text-xs text-gray-500 dark:text-gray-500 pt-3 border-t border-pink-100/50">
            {approval.status === 'approved' ? '批准' : approval.status === 'rejected' ? '拒绝' : '过期'} 
            由 {approval.decidedBy}
          </div>
        )}
      </div>
    </Card>
  );
}
