'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToastStore, type ToastType } from '@/lib/toast'
import { useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'
import { useReducedMotion } from '@/components/motion-config'

const toastIcons: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const toastStyles: Record<ToastType, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100',
  error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/30 dark:border-red-800 dark:text-red-100',
  info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100',
  warning: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100',
}

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-500 dark:text-emerald-400',
  error: 'text-red-500 dark:text-red-400',
  info: 'text-blue-500 dark:text-blue-400',
  warning: 'text-amber-500 dark:text-amber-400',
}

const toastRoles: Record<ToastType, 'status' | 'alert'> = {
  success: 'status',
  error: 'alert',
  info: 'status',
  warning: 'alert',
}

export function Toaster() {
  const { toasts, remove } = useToastStore()
  const { prefersReducedMotion } = useReducedMotion()

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm md:top-auto md:bottom-6 md:right-6 md:left-auto md:translate-x-0 md:w-auto"
      role="region"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onRemove={remove}
            reducedMotion={prefersReducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Hook for using toast
export function useToast() {
  const { add } = useToastStore()
  return { addToast: add }
}

// Individual toast item with auto-dismiss
interface ToastItemProps {
  toast: import('@/lib/toast').Toast
  onRemove: (id: string) => void
  reducedMotion: boolean
}

function ToastItem({ toast, onRemove, reducedMotion }: ToastItemProps) {
  const Icon = toastIcons[toast.type]
  
  const handleRemove = useCallback(() => {
    onRemove(toast.id)
  }, [onRemove, toast.id])

  useEffect(() => {
    const timer = setTimeout(() => {
      handleRemove()
    }, toast.duration || 5000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, handleRemove])
  
  const motionProps = reducedMotion
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, y: -20, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, x: 20, scale: 0.95 },
        transition: {
          type: 'spring' as const,
          stiffness: 400,
          damping: 30,
        },
      }
  
  return (
    <motion.div
      {...motionProps}
      role={toastRoles[toast.type]}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn(
        'relative flex items-start gap-3 p-3 md:p-4 rounded-xl border shadow-lg backdrop-blur-sm',
        toastStyles[toast.type]
      )}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', iconColors[toast.type])} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
        )}
      </div>
      <button
        onClick={handleRemove}
        className="shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
        type="button"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
      
      {/* Progress bar */}
      {!reducedMotion && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: (toast.duration || 5000) / 1000, ease: 'linear' }}
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5 origin-left rounded-b-xl',
            iconColors[toast.type]
          )}
          aria-hidden="true"
        />
      )}
    </motion.div>
  )
}
