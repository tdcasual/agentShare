'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { tr } from '@/lib/i18n-shared'
import type { Locale } from '@/lib/i18n-shared'
import { Checkbox } from '@/components/ui/checkbox'
import { useReducedMotion } from '@/components/motion-config'

interface BatchToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: (selected: boolean) => void
  onBatchApprove: () => void
  onBatchReject: () => void
  onClear: () => void
  locale: Locale
  className?: string
}

export function BatchToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onBatchApprove,
  onBatchReject,
  onClear,
  locale,
  className
}: BatchToolbarProps) {
  const isActive = selectedCount > 0
  const { prefersReducedMotion } = useReducedMotion()

  const isIndeterminate = selectedCount > 0 && selectedCount < totalCount
  const isAllSelected = selectedCount === totalCount && totalCount > 0

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 rounded-xl border transition-all duration-200',
        isActive 
          ? 'py-3 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900' 
          : 'py-2.5 border-transparent',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={(checked) => onSelectAll(checked)}
          aria-label={tr(locale, 'Select all items', '选择所有项目')}
        />
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {isActive 
            ? tr(locale, `${selectedCount} selected`, `已选择 ${selectedCount} 项`)
            : tr(locale, `${totalCount} items`, `${totalCount} 个项目`)
          }
        </span>
      </div>

      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <motion.button
              onClick={onBatchApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              type="button"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              {tr(locale, 'Approve', '批准')}
            </motion.button>
            <motion.button
              onClick={onBatchReject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              type="button"
            >
              <X className="w-4 h-4" aria-hidden="true" />
              {tr(locale, 'Reject', '拒绝')}
            </motion.button>
            <motion.button
              onClick={onClear}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              type="button"
              aria-label={tr(locale, 'Clear selection', '清除选择')}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
