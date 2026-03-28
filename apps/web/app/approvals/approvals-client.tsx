'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ApprovalCard } from '../../components/approvals/approval-card'
import { BatchToolbar } from '../../components/approvals/batch-toolbar'
import { toastSuccess } from '../../lib/toast'
import { tr } from '../../lib/i18n-shared'
import type { Locale } from '../../lib/i18n-shared'

interface Approval {
  id: string
  agent_id: string
  capability_id: string
  action_type: string
  policy_reason: string
  status: string
  created_at: string
}

interface ApprovalsClientProps {
  initialApprovals: Approval[]
  locale: Locale
}

export function ApprovalsClient({ initialApprovals, locale }: ApprovalsClientProps) {
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleApprove = useCallback((id: string) => {
    setApprovals(prev => prev.filter(a => a.id !== id))
    toastSuccess(
      tr(locale, 'Approval granted', '已批准'),
      tr(locale, 'The request has been approved successfully.', '请求已成功批准。')
    )
  }, [locale])

  const handleReject = useCallback((id: string, _reason: string) => {
    setApprovals(prev => prev.filter(a => a.id !== id))
    toastSuccess(
      tr(locale, 'Approval rejected', '已拒绝'),
      tr(locale, 'The request has been rejected.', '请求已被拒绝。')
    )
  }, [locale])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(approvals.map(a => a.id)))
    } else {
      setSelectedIds(new Set())
    }
  }, [approvals])

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleBatchApprove = useCallback(() => {
    setApprovals(prev => prev.filter(a => !selectedIds.has(a.id)))
    toastSuccess(
      tr(locale, `${selectedIds.size} approvals granted`, `已批准 ${selectedIds.size} 项`),
      tr(locale, 'All selected requests have been approved.', '所有选中的请求已成功批准。')
    )
    setSelectedIds(new Set())
  }, [selectedIds, locale])

  const handleBatchReject = useCallback(() => {
    setApprovals(prev => prev.filter(a => !selectedIds.has(a.id)))
    toastSuccess(
      tr(locale, `${selectedIds.size} approvals rejected`, `已拒绝 ${selectedIds.size} 项`),
      tr(locale, 'All selected requests have been rejected.', '所有选中的请求已被拒绝。')
    )
    setSelectedIds(new Set())
  }, [selectedIds, locale])

  const handleClear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Batch Toolbar */}
      <BatchToolbar
        selectedCount={selectedIds.size}
        totalCount={approvals.length}
        onSelectAll={handleSelectAll}
        onBatchApprove={handleBatchApprove}
        onBatchReject={handleBatchReject}
        onClear={handleClear}
        locale={locale}
      />

      {/* Approval List */}
      <motion.div 
        className="space-y-4"
        layout
      >
        <AnimatePresence mode="popLayout">
          {approvals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                {tr(locale, 'All caught up!', '全部处理完毕！')}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                {tr(locale, 'No pending approvals at the moment.', '当前没有待处理的审批。')}
              </p>
            </motion.div>
          ) : (
            approvals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                locale={locale}
                onApprove={handleApprove}
                onReject={handleReject}
                selected={selectedIds.has(approval.id)}
                onSelect={(selected) => handleSelect(approval.id, selected)}
              />
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
