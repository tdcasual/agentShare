'use client';

import * as React from 'react';
import { useI18n } from './i18n-provider';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error }: { error?: Error }) {
  const { t } = useI18n();
  
  const handleReload = () => {
    window.location.reload();
  };

  const handleReset = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-[#1A1A2E] dark:to-[#252540] p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#252540] rounded-3xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-2">
          {t('error.title') || 'Oops! Something went wrong'}
        </h1>
        
        <p className="text-gray-600 dark:text-[#9CA3AF] mb-6">
          {t('error.description') || 'We apologize for the inconvenience. Please try refreshing the page or go back to the home page.'}
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mb-6 p-4 bg-gray-100 dark:bg-[#1A1A2E] rounded-xl text-left overflow-auto">
            <p className="text-sm font-mono text-red-600 dark:text-red-400">{error.message}</p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleReload}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-white font-medium hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]"
          >
            <RefreshCw className="w-4 h-4" />
            {t('error.reload') || 'Reload Page'}
          </button>
          
          <button
            onClick={handleReset}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gray-100 dark:bg-[#3D3D5C] text-gray-700 dark:text-[#E8E8EC] font-medium hover:bg-gray-200 dark:hover:bg-[#4D4D6C] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]"
          >
            {t('error.goHome') || 'Go Home'}
          </button>
        </div>
      </div>
    </div>
  );
}
