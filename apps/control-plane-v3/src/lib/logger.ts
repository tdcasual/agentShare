/* eslint-disable no-console */
/**
 * Logger - 统一日志管理
 *
 * 自动在开发环境输出详细日志，生产环境静默
 * 支持命名空间，便于过滤
 */

const IS_DEV = process.env.NODE_ENV === 'development';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  namespace: string;
  level?: LogLevel;
}

class Logger {
  private namespace: string;
  private level: LogLevel;

  constructor(options: LoggerOptions) {
    this.namespace = options.namespace;
    this.level = options.level || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    if (!IS_DEV) {
      return level === 'error';
    }
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private format(message: string): string {
    return `[${this.namespace}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format(message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.format(message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format(message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.format(message), ...args);
    }
  }
}

// 预定义的日志实例
export const logger = {
  api: new Logger({ namespace: 'API', level: 'info' }),
  auth: new Logger({ namespace: 'Auth', level: 'info' }),
  runtime: new Logger({ namespace: 'Runtime', level: 'debug' }),
  ui: new Logger({ namespace: 'UI', level: 'warn' }),
  error: new Logger({ namespace: 'Error', level: 'error' }),
  notifications: new Logger({ namespace: 'Notifications', level: 'info' }),
  pwa: new Logger({ namespace: 'PWA', level: 'info' }),
};

export function createLogger(namespace: string, level?: LogLevel): Logger {
  return new Logger({ namespace, level });
}
