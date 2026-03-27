'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import { useReducedMotion } from '@/components/motion-config'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  animate?: boolean
}

export function Skeleton({
  className,
  animate = true,
  ...props
}: SkeletonProps) {
  const { prefersReducedMotion } = useReducedMotion()
  const shouldAnimate = animate && !prefersReducedMotion

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800',
        className
      )}
      {...props}
    >
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 -translate-x-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
          animate={{
            translateX: ['-100%', '100%']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      )}
    </div>
  )
}

// Preset skeleton layouts
export function SkeletonCard() {
  return (
    <div className="p-5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// Dashboard-specific skeleton
export function SkeletonDashboard() {
  return (
    <div className="space-y-8">
      <SkeletonStats />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <Skeleton className="h-4 w-24" />
          </div>
          <SkeletonList count={4} />
        </div>
        <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <Skeleton className="h-4 w-24" />
          </div>
          <SkeletonList count={4} />
        </div>
      </div>
    </div>
  )
}
