/**
 * Error Boundary - 错误边界组件
 *
 * Kawaii风格的错误页面
 * 捕获子组件的错误，防止整个应用崩溃
 */

'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { useI18n } from '@/components/i18n-provider';
import { useRole } from '@/hooks/use-role';
import { getDefaultManagementRoute, type ManagementRole } from '@/lib/role-system';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** 自定义错误回退UI */
  fallback?: ReactNode;
  /** 错误发生时回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryInnerProps extends Props {
  homeTarget: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export function getErrorBoundaryHomeTarget(role: ManagementRole | null | undefined): string {
  return getDefaultManagementRoute(role);
}

function ErrorFallback({
  error,
  onReload,
  onGoHome,
}: {
  error?: Error;
  onReload: () => void;
  onGoHome: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card
        variant="kawaii"
        decoration
        className="w-full max-w-lg text-center"
        role="alert"
        aria-live="assertive"
      >
        {/* 错误图标 */}
        <div className="dark:bg-[var(--kw-dark-error-surface)]/20 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kw-rose-surface)]">
          <AlertTriangle className="h-10 w-10 text-[var(--kw-error)]" />
        </div>

        {/* 标题 */}
        <h2 className="mb-2 text-xl font-bold text-[var(--kw-text)]">{t('errorBoundary.title')}</h2>

        {/* 错误信息 */}
        <p className="mb-2 text-sm text-[var(--kw-text-muted)]">
          {error?.message || t('common.unknownError')}
        </p>

        {/* 技术详情（开发环境显示） */}
        {process.env.NODE_ENV === 'development' && error?.stack && (
          <pre className="dark:bg-[var(--kw-dark-error-surface)]/10 mb-4 max-h-40 overflow-auto rounded-lg bg-[var(--kw-rose-surface)] p-3 text-left text-xs text-[var(--kw-error)] dark:text-[var(--kw-error)]">
            {error.stack}
          </pre>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="kawaii" onClick={onReload} leftIcon={<RefreshCw className="h-4 w-4" />}>
            {t('common.refreshPage')}
          </Button>
          <Button variant="outline" onClick={onGoHome} leftIcon={<Home className="h-4 w-4" />}>
            {t('common.backToHome')}
          </Button>
        </div>

        {/* 提示 */}
        <p className="mt-4 text-xs text-[var(--kw-text-muted)]">
          {t('errorBoundary.contactSupport')}
        </p>
      </Card>
    </div>
  );
}

class ErrorBoundaryInner extends Component<ErrorBoundaryInnerProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = this.props.homeTarget;
  };

  render() {
    if (this.state.hasError) {
      // 使用自定义fallback或默认错误UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: Props) {
  const { role } = useRole();

  return <ErrorBoundaryInner {...props} homeTarget={getErrorBoundaryHomeTarget(role)} />;
}
