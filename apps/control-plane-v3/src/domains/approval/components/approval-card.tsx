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
import { CheckCircle, XCircle, Clock, Bot, FileText, Shield } from 'lucide-react';

interface ApprovalCardProps {
  approval: Approval;
  onApprove: (id: string, comment?: string) => Promise<void>;
  onReject: (id: string, reason: string, comment?: string) => Promise<void>;
  isProcessing?: boolean;
}

// 扩展状态配置以包含 expired
const statusConfig: Record<
  ApprovalStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  pending: {
    label: '待审批',
    icon: <Clock className="h-4 w-4" />,
    color:
      'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)] dark:bg-[var(--kw-dark-amber-surface)]/30 dark:text-[var(--kw-warning)]',
  },
  approved: {
    label: '已批准',
    icon: <CheckCircle className="h-4 w-4" />,
    color:
      'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] dark:bg-[var(--kw-dark-success-surface)]/30 dark:text-[var(--kw-dark-mint)]',
  },
  rejected: {
    label: '已拒绝',
    icon: <XCircle className="h-4 w-4" />,
    color:
      'bg-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:bg-[var(--kw-dark-error-surface)]/30 dark:text-[var(--kw-error)]',
  },
  expired: {
    label: '已过期',
    icon: <Clock className="h-4 w-4" />,
    color:
      'bg-[var(--kw-surface-alt)] text-[var(--kw-text)] dark:bg-[var(--kw-dark-bg)]/30 dark:text-[var(--kw-text-muted)]',
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
  isProcessing = false,
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
    if (!rejectReason.trim()) {
      return;
    }
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
      <div
        className={`absolute bottom-0 left-0 top-0 w-1 ${
          approval.status === 'pending'
            ? 'bg-[var(--kw-warning)]'
            : approval.status === 'approved'
              ? 'bg-[var(--kw-agent-accent)]'
              : approval.status === 'expired'
                ? 'bg-gray-400'
                : 'bg-[var(--kw-error)]'
        }`}
      />

      <div className="pl-4">
        {/* 头部：操作类型和状态 */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--kw-primary-500)]" />
            <span className="font-medium text-[var(--kw-text)]">
              {actionTypeLabels[approval.actionType] || approval.actionType}
            </span>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${status.color}`}
          >
            {status.icon}
            {status.label}
          </span>
        </div>

        {/* Capability 信息 */}
        <div className="mb-3">
          <p className="text-sm text-[var(--kw-text-muted)]">
            Capability: <span className="font-medium">{approval.capabilityId}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--kw-text-muted)]">Task: {approval.taskId}</p>
        </div>

        {/* Agent 信息 */}
        <div className="mb-4 flex items-center gap-4 text-sm text-[var(--kw-text-muted)]">
          <div className="flex items-center gap-1">
            <Bot className="h-4 w-4" />
            <span>{approval.agentId}</span>
          </div>
          {approval.expiresAt && (
            <div className="flex items-center gap-1 text-xs">
              <Shield className="h-3 w-3" />
              <span>过期: {new Date(approval.expiresAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Policy 原因 */}
        {approval.policyReason && (
          <div className="bg-[var(--kw-sky-surface)]/50 dark:bg-[var(--kw-dark-info-surface)]/10 mb-3 rounded-xl p-3">
            <p className="text-sm text-[var(--kw-text-muted)]">
              <span className="font-medium">策略原因:</span> {approval.policyReason}
            </p>
            {approval.policySource && (
              <p className="mt-1 text-xs text-[var(--kw-text-muted)]">
                来源: {approval.policySource}
              </p>
            )}
          </div>
        )}

        {/* 申请理由 */}
        {approval.reason && (
          <div className="bg-[var(--kw-primary-50)]/50 dark:bg-[var(--kw-dark-pink-surface)]/10 mb-4 rounded-xl p-3">
            <p className="text-sm text-[var(--kw-text-muted)]">
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
                  leftIcon={<CheckCircle className="h-4 w-4" />}
                  className="flex-1"
                >
                  批准
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isProcessing || localProcessing}
                  leftIcon={<XCircle className="h-4 w-4" />}
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
                  className="w-full resize-none rounded-xl border border-[var(--kw-primary-200)] bg-white px-3 py-2 text-sm text-[var(--kw-text)] focus:outline-none focus:ring-2 focus:ring-[var(--kw-primary-400)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-surface-alt)]"
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
          <div className="border-[var(--kw-border)]/50 border-t pt-3 text-xs text-[var(--kw-text-muted)]">
            {approval.status === 'approved'
              ? '批准'
              : approval.status === 'rejected'
                ? '拒绝'
                : '过期'}
            由 {approval.decidedBy}
          </div>
        )}
      </div>
    </Card>
  );
}
