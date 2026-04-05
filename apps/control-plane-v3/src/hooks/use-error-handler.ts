/**
 * 错误处理 Hooks
 * 
 * 提供：
 * - 全局错误监听
 * - 错误自动处理
 * - 错误上报
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AppError, 
  ErrorType, 
  globalErrorHandler, 
  toAppError,
  ErrorHandlerConfig 
} from '@/lib/errors';

interface UseErrorHandlerOptions {
  redirectOnAuth?: boolean;
  showToast?: boolean;
  onError?: (error: AppError) => void;
}

/**
 * 全局错误处理 Hook
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const router = useRouter();
  const { redirectOnAuth = true, showToast = true, onError } = options;

  useEffect(() => {
    const config: ErrorHandlerConfig = {
      onAuthError: () => {
        if (redirectOnAuth) {
          router.push('/login');
        }
      },
      onError: (error) => {
        if (showToast) {
          // 这里可以集成 toast 通知
          console.error('[Error]', error.getUserMessage());
        }
        onError?.(error);
      },
    };

    globalErrorHandler.setConfig(config);
  }, [router, redirectOnAuth, showToast, onError]);
}

/**
 * 带错误状态的异步操作
 */
export function useAsyncWithError<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const execute = useCallback(async (
    asyncFn: () => Promise<T>,
    options: {
      onSuccess?: (data: T) => void;
      onError?: (error: AppError) => void;
    } = {}
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const appError = toAppError(err);
      setError(appError);
      globalErrorHandler.handle(appError);
      options.onError?.(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
  };
}

/**
 * API 错误处理
 */
export function useApiError() {
  const handleError = useCallback((error: unknown) => {
    const appError = toAppError(error);
    globalErrorHandler.handle(appError);
    return appError;
  }, []);

  const getErrorMessage = useCallback((error: unknown, locale: 'zh-CN' | 'en' = 'zh-CN') => {
    const appError = toAppError(error);
    return appError.getUserMessage(locale);
  }, []);

  return {
    handleError,
    getErrorMessage,
  };
}

/**
 * 表单错误处理
 */
export function useFormError() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleValidationError = useCallback((error: unknown) => {
    const appError = toAppError(error);
    
    if (appError.type === ErrorType.VALIDATION && appError.details) {
      const errors: Record<string, string> = {};
      
      Object.entries(appError.details).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          errors[field] = messages[0];
        } else {
          errors[field] = String(messages);
        }
      });
      
      setFieldErrors(errors);
    }

    return appError;
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  return {
    fieldErrors,
    handleValidationError,
    clearFieldError,
    clearAllErrors,
  };
}

/**
 * 错误重试
 */
export function useRetry(maxRetries = 3) {
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<AppError | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const retryCountRef = useRef(0);

  // 清理函数
  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const retry = useCallback(async <T>(
    fn: () => Promise<T>,
    options: {
      onRetry?: (count: number) => void;
      shouldRetry?: (error: AppError) => boolean;
    } = {}
  ): Promise<T> => {
    // 使用 ref 跟踪当前重试计数，避免闭包问题
    const currentRetryCount = retryCountRef.current;
    
    try {
      const result = await fn();
      if (isActiveRef.current) {
        setRetryCount(0);
        retryCountRef.current = 0;
        setLastError(null);
      }
      return result;
    } catch (error) {
      if (!isActiveRef.current) {
        throw error;
      }
      
      const appError = toAppError(error);
      setLastError(appError);

      const shouldRetry = (options.shouldRetry?.(appError)) ?? 
        (appError.type === ErrorType.NETWORK || 
        appError.type === ErrorType.TIMEOUT ||
        appError.type === ErrorType.SERVER);

      if (shouldRetry && currentRetryCount < maxRetries) {
        const nextCount = currentRetryCount + 1;
        setRetryCount(nextCount);
        retryCountRef.current = nextCount;
        options.onRetry?.(nextCount);

        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, nextCount), 10000);
        
        // 清理之前的 timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        await new Promise<void>((resolve) => {
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            resolve();
          }, delay);
        });

        // 如果组件已卸载，不再继续
        if (!isActiveRef.current) {
          throw new Error('Component unmounted during retry', {
            cause: error,
          });
        }

        return retry(fn, options);
      }

      throw appError;
    }
  }, [maxRetries]);

  const reset = useCallback(() => {
    setRetryCount(0);
    retryCountRef.current = 0;
    setLastError(null);
  }, []);

  return {
    retry,
    retryCount,
    lastError,
    reset,
  };
}
