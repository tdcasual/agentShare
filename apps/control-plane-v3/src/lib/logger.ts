/* eslint-disable no-console */
/**
 * Logger - 统一日志管理
 *
 * 自动在开发环境输出详细日志，生产环境静默
 * 支持命名空间，便于过滤
 * 支持浏览器端错误持久化和 correlation ID
 */

const IS_DEV = process.env.NODE_ENV === 'development';
const LOG_STORAGE_KEY = 'agentshare:error-logs';
const MAX_STORED_LOGS = 100;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  namespace: string;
  level?: LogLevel;
}

interface StoredLogEntry {
  namespace: string;
  level: LogLevel;
  message: string;
  path: string;
  correlationId: string;
  timestamp: string;
}

function generateCorrelationId(): string {
  return `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Memory fallback for environments where localStorage is mocked or unavailable
let _memoryLogs: StoredLogEntry[] = [];

function readStoredLogs(): StoredLogEntry[] {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const raw = localStorage.getItem(LOG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          _memoryLogs = parsed as StoredLogEntry[];
          return _memoryLogs;
        }
      }
    }
  } catch {
    // fall through to memory
  }
  return _memoryLogs;
}

function writeStoredLogs(entries: StoredLogEntry[]): void {
  _memoryLogs = entries;
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
    }
  } catch {
    // Storage quota exceeded or private mode
  }
}

function appendStoredLog(entry: StoredLogEntry): void {
  const logs = readStoredLogs();
  logs.push(entry);
  if (logs.length > MAX_STORED_LOGS) {
    logs.splice(0, logs.length - MAX_STORED_LOGS);
  }
  writeStoredLogs(logs);
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

    // Persist error entries with correlation ID and path context
    const path =
      typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
    appendStoredLog({
      namespace: this.namespace,
      level: 'error',
      message,
      path,
      correlationId: generateCorrelationId(),
      timestamp: new Date().toISOString(),
    });
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

/**
 * 读取持久化的浏览器错误日志
 */
export function getStoredLogs(): StoredLogEntry[] {
  return readStoredLogs();
}

/**
 * 清空持久化的浏览器错误日志
 */
export function clearStoredLogs(): void {
  writeStoredLogs([]);
}
