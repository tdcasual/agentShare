'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { tr } from '@/lib/i18n-shared'
import type { Locale } from '@/lib/i18n-shared'
import { useReducedMotion } from '@/components/motion-config'

interface ApprovalCardProps {
  approval: any
  locale: Locale
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
  selected?: boolean
  onSelect?: (selected: boolean) => void
  disabled?: boolean
}

export function ApprovalCard({
  approval,
  locale,
  onApprove,
  onReject,
  selected = false,
  onSelect,
  disabled = false
}: ApprovalCardProps) {
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionTaken, setActionTaken] = useState<'approved' | 'rejected' | null>(null)
  const { prefersReducedMotion } = useReducedMotion()

  const handleApprove = useCallback(() => {
    setActionTaken('approved')
    onApprove(approval.id)
  }, [approval.id, onApprove])

  const handleReject = useCallback(() => {
    if (!isRejecting) {
      setIsRejecting(true)
      return
    }
    if (rejectReason.trim()) {
      setActionTaken('rejected')
      onReject(approval.id, rejectReason)
      setIsRejecting(false)
    }
  }, [isRejecting, rejectReason, approval.id, onReject])

  const handleUndo = useCallback(() => {
    setActionTaken(null)
    setIsRejecting(false)
    setRejectReason('')
  }, [])

  const handleCancelReject = useCallback(() => {
    setIsRejecting(false)
    setRejectReason('')
  }, [])

  const motionProps = prefersReducedMotion
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, x: -100 },
        transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
      }

  if (actionTaken) {
    return (
      <motion.div
        {...motionProps}
        className={cn(
          'flex items-center justify-between p-4 rounded-xl border',
          actionTaken === 'approved' 
            ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50' 
            : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            actionTaken === 'approved' 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          )}>
            {actionTaken === 'approved' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </div>
          <div>
            <p className={cn(
              'font-medium capitalize',
              actionTaken === 'approved' ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'
            )}>
              {actionTaken === 'approved' 
                ? tr(locale, 'Approved', '已批准') 
                : tr(locale, 'Rejected', '已拒绝')}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {approval.policy_reason || 'Approval Request'}
            </p>
          </div>
        </div>
        <motion.button
          onClick={handleUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
          type="button"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          {tr(locale, 'Undo', '撤销')}
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div
      {...motionProps}
      className={cn(
        'group relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm overflow-hidden',
        selected && 'ring-2 ring-neutral-900 dark:ring-white'
      )}
    >
      <div className="p-5">
        {/* Header with checkbox and badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {onSelect && (
              <Checkbox
                checked={selected}
                onChange={(checked) => onSelect?.(checked)}
                aria-label={tr(locale, 'Select this approval', '选择此审批')}
              />
            )}
            <Badge variant="warning" size="sm">
              {tr(locale, 'Pending', '待处理')}
            </Badge>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatTimeAgo(approval.created_at, locale)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-start gap-4">
          {/* Avatar with deterministic color based on agent_id */}
          <AgentAvatar agentId={approval.agent_id} />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
              {approval.policy_reason || 'Approval Request'}
            </h3>
            <div className="space-y-1 text-sm text-neutral-500 dark:text-neutral-400">
              <p>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{tr(locale, 'Agent', 'Agent')}:</span>{' '}
                {approval.agent_id}
              </p>
              <p>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{tr(locale, 'Capability', '能力')}:</span>{' '}
                {approval.capability_id}
              </p>
              <p>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{tr(locale, 'Action', '动作')}:</span>{' '}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                  {approval.action_type}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <AnimatePresence mode="wait" initial={false}>
            {!isRejecting ? (
              <motion.div
                key="actions"
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? {} : { opacity: 0 }}
                className="flex gap-3"
              >
                <motion.button
                  onClick={handleApprove}
                  disabled={disabled}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors disabled:opacity-50"
                  whileTap={prefersReducedMotion || disabled ? {} : { scale: 0.98 }}
                  type="button"
                >
                  <Check className="w-4 h-4" aria-hidden="true" />
                  {tr(locale, 'Approve', '批准')}
                </motion.button>
                <motion.button
                  onClick={handleReject}
                  disabled={disabled}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                  whileTap={prefersReducedMotion || disabled ? {} : { scale: 0.98 }}
                  type="button"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  {tr(locale, 'Reject', '拒绝')}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="reject-form"
                initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <input
                  type="text"
                  placeholder={tr(locale, 'Reason for rejection (optional)', '拒绝原因（可选）')}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 dark:focus:ring-red-500/30"
                />
                <div className="flex gap-2">
                  <motion.button
                    onClick={handleCancelReject}
                    className="flex-1 px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    type="button"
                  >
                    {tr(locale, 'Cancel', '取消')}
                  </motion.button>
                  <motion.button
                    onClick={handleReject}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    type="button"
                  >
                    {tr(locale, 'Confirm', '确认')}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// Deterministic avatar color based on agent_id - using solid colors instead of gradients
function AgentAvatar({ agentId }: { agentId?: string }) {
  const colors = [
    { bg: 'bg-slate-600', shadow: 'shadow-slate-200 dark:shadow-slate-900' },
    { bg: 'bg-zinc-600', shadow: 'shadow-zinc-200 dark:shadow-zinc-900' },
    { bg: 'bg-stone-600', shadow: 'shadow-stone-200 dark:shadow-stone-900' },
    { bg: 'bg-neutral-600', shadow: 'shadow-neutral-200 dark:shadow-neutral-900' },
    { bg: 'bg-gray-600', shadow: 'shadow-gray-200 dark:shadow-gray-900' },
    { bg: 'bg-slate-700', shadow: 'shadow-slate-300 dark:shadow-slate-950' },
  ]
  
  const index = agentId 
    ? agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    : 0
  
  const color = colors[index]
  const initial = agentId?.[0]?.toUpperCase() || 'A'
  
  return (
    <div className={cn(
      'w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0 shadow-lg',
      color.bg,
      color.shadow
    )}>
      {initial}
    </div>
  )
}

function formatTimeAgo(date: string, locale: Locale): string {
  const now = new Date()
  const past = new Date(date)
  const diff = now.getTime() - past.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (locale === 'zh') {
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    return `${days}天前`
  }
  
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
