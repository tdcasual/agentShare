/**
 * Approval Card - 审批卡片组件
 *
 * Kawaii风格，带状态徽章和操作按钮
 * 与后端 /api/approvals 返回的 ApprovalResponse 对齐
 */

'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { useI18n } from '@/components/i18n-provider';
import type { Approval, ApprovalStatus } from '../types';
import { CheckCircle, XCircle, Clock, Bot, FileText, Shield } from 'lucide-react';

interface ApprovalCardProps {
  approval: Approval;
  onApprove: (id: string, comment?: string) => Promise<void>;
  onReject: (id: string, reason: string, comment?: string) => Promise<void>;
  isProcessing?: boolean;
}

const statusColors: Record<ApprovalStatus, string> = {
  pending:
    'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)] dark:bg-[var(--kw-dark-amber-surface)]/30 dark:text-[var(--kw-warning)]',
  approved:
    'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] dark:bg-[var(--kw-dark-success-surface)]/30 dark:text-[var(--kw-dark-mint)]',
  rejected:
    'bg-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:bg-[var(--kw-dark-error-surface)]/30 dark:text-[var(--kw-error)]',
  expired:
    'bg-[var(--kw-surface-alt)] text-[var(--kw-text)] dark:bg-[var(--kw-dark-bg)]/30 dark:text-[var(--kw-text-muted)]',
};

const statusIcons: Record<ApprovalStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  expired: <Clock className="h-4 w-4" />,
};

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  isProcessing = false,
}: ApprovalCardProps) {
  const { t, locale } = useI18n();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [localProcessing, setLocalProcessing] = useState(false);

  const statusLabel = t(`approvals.status.${approval.status}`);
  const isPending = approval.status === 'pending';

  const actionTypeLabel = useMemo(() => {
    return t(`approvals.actionType.${approval.actionType}`) || approval.actionType;
  }, [approval.actionType, t]);

  const statusBarColor = useMemo(() => {
    if (approval.status === 'pending') {
      return 'bg-[var(--kw-warning)]';
    }
    if (approval.status === 'approved') {
      return 'bg-[var(--kw-agent-accent)]';
    }
    if (approval.status === 'expired') {
      return 'bg-[var(--kw-text-muted)]';
    }
    return 'bg-[var(--kw-error)]';
  }, [approval.status]);

  const processedText = useMemo(() => {
    if (!approval.decidedBy) {
      return null;
    }
    const action =
      approval.status === 'approved'
        ? t('approvals.status.approved')
        : approval.status === 'rejected'
          ? t('approvals.status.rejected')
          : t('approvals.status.expired');
    return t('approvals.processedBy')
      .replace('{action}', action)
      .replace('{decidedBy}', approval.decidedBy);
  }, [approval.decidedBy, approval.status, t]);

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
    <Card variant="kawaii" role="listitem" className="relative overflow-hidden">
      {/* 状态指示条 */}
      <div className={`absolute bottom-0 left-0 top-0 w-1 ${statusBarColor}`} />

      <div className="pl-4">
        {/* 头部：操作类型和状态 */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--kw-primary-500)]" />
            <span className="font-medium text-[var(--kw-text)]">{actionTypeLabel}</span>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusColors[approval.status]}`}
          >
            {statusIcons[approval.status]}
            {statusLabel}
          </span>
        </div>

        {/* Capability 信息 */}
        <div className="mb-3">
          <p className="text-sm text-[var(--kw-text-muted)]">
            {t('approvals.capability')}: <span className="font-medium">{approval.capabilityId}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--kw-text-muted)]">
            {t('approvals.task')}: {approval.taskId}
          </p>
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
              <span>
                {t('approvals.expiresAt')}: {new Date(approval.expiresAt).toLocaleString(locale)}
              </span>
            </div>
          )}
        </div>

        {/* Policy 原因 */}
        {approval.policyReason && (
          <div className="bg-[var(--kw-sky-surface)]/50 dark:bg-[var(--kw-dark-info-surface)]/10 mb-3 rounded-xl p-3">
            <p className="text-sm text-[var(--kw-text-muted)]">
              <span className="font-medium">{t('approvals.policyReason')}:</span> {approval.policyReason}
            </p>
            {approval.policySource && (
              <p className="mt-1 text-xs text-[var(--kw-text-muted)]">
                {t('approvals.source')}: {approval.policySource}
              </p>
            )}
          </div>
        )}

        {/* 申请理由 */}
        {approval.reason && (
          <div className="bg-[var(--kw-primary-50)]/50 dark:bg-[var(--kw-dark-pink-surface)]/10 mb-4 rounded-xl p-3">
            <p className="text-sm text-[var(--kw-text-muted)]">
              <span className="font-medium">{t('approvals.reasonLabel')}:</span> {approval.reason}
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
                  {t('common.approve')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isProcessing || localProcessing}
                  leftIcon={<XCircle className="h-4 w-4" />}
                  className="flex-1"
                >
                  {t('common.reject')}
                </Button>
              </>
            ) : (
              <div className="flex-1 space-y-2">
                <label
                  htmlFor={`reject-reason-${approval.id}`}
                  className="block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-surface-alt)]"
                >
                  {t('approvals.rejectReasonLabel')}
                </label>
                <textarea
                  id={`reject-reason-${approval.id}`}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('approvals.rejectReasonPlaceholder')}
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
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="kawaii"
                    size="sm"
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || localProcessing}
                    className="flex-1"
                  >
                    {t('approvals.confirmReject')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 已处理信息 */}
        {!isPending && processedText && (
          <div className="border-[var(--kw-border)]/50 border-t pt-3 text-xs text-[var(--kw-text-muted)]">
            {processedText}
          </div>
        )}
      </div>
    </Card>
  );
}
