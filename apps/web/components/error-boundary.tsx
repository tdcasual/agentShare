'use client'

import { Component, ReactNode, ErrorInfo } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 transition-colors"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                type="button"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Simple error message component for inline errors
export function ErrorMessage({ 
  message, 
  onRetry 
}: { 
  message: string
  onRetry?: () => void 
}) {
  return (
    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
