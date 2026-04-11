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
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** 自定义错误回退UI */
  fallback?: ReactNode;
  /** 错误发生时回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
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
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // 使用自定义fallback或默认错误UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

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
            <h2 className="mb-2 text-xl font-bold text-[var(--kw-text)]">页面出错了</h2>

            {/* 错误信息 */}
            <p className="mb-2 text-sm text-[var(--kw-text-muted)]">
              {this.state.error?.message || '未知错误'}
            </p>

            {/* 技术详情（开发环境显示） */}
            {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
              <pre className="dark:bg-[var(--kw-dark-error-surface)]/10 mb-4 max-h-40 overflow-auto rounded-lg bg-[var(--kw-rose-surface)] p-3 text-left text-xs text-[var(--kw-error)] dark:text-[var(--kw-error)]">
                {this.state.error.stack}
              </pre>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="kawaii"
                onClick={this.handleReload}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                刷新页面
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                leftIcon={<Home className="h-4 w-4" />}
              >
                返回首页
              </Button>
            </div>

            {/* 提示 */}
            <p className="mt-4 text-xs text-[var(--kw-text-muted)]">
              如果问题持续存在，请联系技术支持
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
