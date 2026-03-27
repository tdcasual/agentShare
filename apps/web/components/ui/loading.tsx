'use client'

import { cn } from '@/lib/utils/cn'
import { Loader2 } from 'lucide-react'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
  fullscreen?: boolean
}

export function Loading({ 
  size = 'md', 
  text,
  className,
  fullscreen = false
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      className
    )}>
      <Loader2 className={cn(
        'animate-spin text-neutral-600 dark:text-neutral-400',
        sizeClasses[size]
      )} />
      {text && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {text}
        </p>
      )}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    )
  }

  return content
}

// Inline loading for buttons/forms
export function InlineLoading({ text }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      {text}
    </span>
  )
}

// Page loading overlay
export function PageLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loading size="lg" text="Loading..." />
    </div>
  )
}
