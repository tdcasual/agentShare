/**
 * 统一错误处理系统
 *
 * 提供：
 * - 错误类型分类
 * - 错误码映射
 * - 用户友好的错误消息
 * - 错误上报
 */

// ============================================
// 错误类型
// ============================================

export enum ErrorType {
  NETWORK = 'NETWORK', // 网络错误
  AUTH = 'AUTH', // 认证错误
  FORBIDDEN = 'FORBIDDEN', // 权限不足
  VALIDATION = 'VALIDATION', // 参数验证错误
  NOT_FOUND = 'NOT_FOUND', // 资源不存在
  CONFLICT = 'CONFLICT', // 资源冲突
  RATE_LIMIT = 'RATE_LIMIT', // 请求频率限制
  SERVER = 'SERVER', // 服务器错误
  TIMEOUT = 'TIMEOUT', // 请求超时
  UNKNOWN = 'UNKNOWN', // 未知错误
}

// ============================================
// 应用错误类
// ============================================

export interface AppErrorOptions {
  type: ErrorType;
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
  cause?: Error;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;
  public readonly cause?: Error;
  public readonly timestamp: Date;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.type = options.type;
    this.code = options.code;
    this.status = options.status || 500;
    this.details = options.details;
    this.cause = options.cause;
    this.timestamp = new Date();
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(locale: 'zh-CN' | 'en' = 'zh-CN'): string {
    const messages: Record<ErrorType, Record<string, string>> = {
      [ErrorType.NETWORK]: {
        'zh-CN': '网络连接失败，请检查网络后重试',
        en: 'Network connection failed, please check your network and retry',
      },
      [ErrorType.AUTH]: {
        'zh-CN': '登录已过期，请重新登录',
        en: 'Session expired, please login again',
      },
      [ErrorType.FORBIDDEN]: {
        'zh-CN': '您没有权限执行此操作',
        en: 'You do not have permission to perform this action',
      },
      [ErrorType.VALIDATION]: {
        'zh-CN': '输入数据有误，请检查后再试',
        en: 'Invalid input data, please check and retry',
      },
      [ErrorType.NOT_FOUND]: {
        'zh-CN': '请求的资源不存在',
        en: 'The requested resource does not exist',
      },
      [ErrorType.CONFLICT]: {
        'zh-CN': '资源冲突，可能已存在相同的记录',
        en: 'Resource conflict, a similar record may already exist',
      },
      [ErrorType.RATE_LIMIT]: {
        'zh-CN': '请求过于频繁，请稍后再试',
        en: 'Too many requests, please try again later',
      },
      [ErrorType.SERVER]: {
        'zh-CN': '服务器内部错误，请稍后重试',
        en: 'Internal server error, please try again later',
      },
      [ErrorType.TIMEOUT]: {
        'zh-CN': '请求超时，请重试',
        en: 'Request timeout, please retry',
      },
      [ErrorType.UNKNOWN]: {
        'zh-CN': '发生未知错误，请稍后重试',
        en: 'An unknown error occurred, please try again later',
      },
    };

    return messages[this.type]?.[locale] || this.message;
  }

  /**
   * 是否应该显示重试按钮
   */
  shouldShowRetry(): boolean {
    return [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER, ErrorType.RATE_LIMIT].includes(
      this.type
    );
  }

  /**
   * 是否应该跳转到登录页
   */
  shouldRedirectToLogin(): boolean {
    return this.type === ErrorType.AUTH;
  }

  /**
   * 转换为 JSON（用于上报）
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
      stack: this.stack,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

// ============================================
// HTTP 状态码映射
// ============================================

export function mapHttpStatusToErrorType(status: number): ErrorType {
  switch (status) {
    case 0:
      return ErrorType.NETWORK;
    case 401:
      return ErrorType.AUTH;
    case 403:
      return ErrorType.FORBIDDEN;
    case 404:
      return ErrorType.NOT_FOUND;
    case 409:
      return ErrorType.CONFLICT;
    case 422:
      return ErrorType.VALIDATION;
    case 429:
      return ErrorType.RATE_LIMIT;
    case 408:
      return ErrorType.TIMEOUT;
    default:
      if (status >= 500) {
        return ErrorType.SERVER;
      }
      return ErrorType.UNKNOWN;
  }
}

// ============================================
// 错误工厂函数
// ============================================

export function createNetworkError(cause?: Error): AppError {
  return new AppError({
    type: ErrorType.NETWORK,
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
    cause,
  });
}

export function createAuthError(message = 'Authentication failed'): AppError {
  return new AppError({
    type: ErrorType.AUTH,
    code: 'AUTH_ERROR',
    message,
    status: 401,
  });
}

export function createValidationError(details: Record<string, unknown>): AppError {
  return new AppError({
    type: ErrorType.VALIDATION,
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    status: 422,
    details,
  });
}

export function createNotFoundError(resource: string): AppError {
  return new AppError({
    type: ErrorType.NOT_FOUND,
    code: 'NOT_FOUND',
    message: `${resource} not found`,
    status: 404,
  });
}

// ============================================
// 错误处理器类型
// ============================================

export type ErrorHandler = (error: AppError) => void;

export interface ErrorHandlerConfig {
  onAuthError?: () => void;
  onNetworkError?: () => void;
  onServerError?: () => void;
  onUnknownError?: () => void;
  onError?: (error: AppError) => void;
}

// ============================================
// 全局错误处理器
// ============================================

class GlobalErrorHandler {
  private handlers: ErrorHandler[] = [];
  private config: ErrorHandlerConfig = {};

  setConfig(config: ErrorHandlerConfig) {
    this.config = config;
  }

  addHandler(handler: ErrorHandler) {
    this.handlers.push(handler);
    return () => {
      const index = this.handlers.indexOf(handler);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  handle(error: AppError) {
    // 调用配置的处理器
    switch (error.type) {
      case ErrorType.AUTH:
        this.config.onAuthError?.();
        break;
      case ErrorType.NETWORK:
        this.config.onNetworkError?.();
        break;
      case ErrorType.SERVER:
        this.config.onServerError?.();
        break;
      default:
        this.config.onUnknownError?.();
    }

    this.config.onError?.(error);

    // 调用注册的处理器
    this.handlers.forEach((handler) => {
      try {
        handler(error);
      } catch {
        // 忽略处理器自身的错误
      }
    });

    // 开发环境输出错误
    if (process.env.NODE_ENV === 'development') {
      console.error('[AppError]', error);
    }
  }
}

export const globalErrorHandler = new GlobalErrorHandler();

// ============================================
// 错误边界辅助函数
// ============================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError({
      type: ErrorType.UNKNOWN,
      code: 'UNKNOWN_ERROR',
      message: error.message,
      cause: error,
    });
  }

  return new AppError({
    type: ErrorType.UNKNOWN,
    code: 'UNKNOWN_ERROR',
    message: String(error),
  });
}
