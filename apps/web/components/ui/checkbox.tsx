'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { Check, Minus } from 'lucide-react'
import { useId, forwardRef } from 'react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  indeterminate?: boolean
  onChange?: (checked: boolean) => void
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, indeterminate, className, onChange, checked, ...props }, ref) => {
    const id = useId()
    const isChecked = checked === true
    const isIndeterminate = indeterminate === true

    return (
      <label
        htmlFor={id}
        className={cn(
          'inline-flex items-center gap-2 cursor-pointer select-none',
          props.disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className="sr-only"
            checked={isChecked}
            onChange={(e) => onChange?.(e.target.checked)}
            aria-checked={isIndeterminate ? 'mixed' : isChecked}
            {...props}
          />
          <motion.div
            className={cn(
              'w-4 h-4 rounded border transition-colors duration-150 flex items-center justify-center',
              isChecked || isIndeterminate
                ? 'bg-neutral-900 border-neutral-900 dark:bg-white dark:border-white'
                : 'bg-white border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
            )}
            whileTap={!props.disabled ? { scale: 0.9 } : undefined}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isIndeterminate ? (
                <motion.div
                  key="indeterminate"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Minus className="w-3 h-3 text-white dark:text-neutral-900" strokeWidth={3} />
                </motion.div>
              ) : isChecked ? (
                <motion.div
                  key="checked"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check className="w-3 h-3 text-white dark:text-neutral-900" strokeWidth={3} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
        {label && (
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {label}
          </span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'
