/**
 * SWR 全局配置
 * 
 * 提供：
 * - 统一的 fetcher
 * - 默认配置
 * - 错误重试策略
 */

import { SWRConfiguration } from 'swr';
import { api, ApiError } from './api';

/**
 * 全局 SWR 配置
 */
export const swrConfig: SWRConfiguration = {
  // 数据刷新策略
  revalidateOnFocus: false,        // 窗口聚焦时不刷新
  revalidateOnReconnect: true,     // 网络恢复时刷新
  refreshInterval: 0,              // 默认不自动轮询
  dedupingInterval: 2000,          // 2秒内重复请求去重
  
  // 错误重试
  shouldRetryOnError: (err) => {
    // 只在网络错误或 5xx 错误时重试
    if (err instanceof ApiError) {
      return err.status >= 500 || err.status === 0;
    }
    return true;
  },
  errorRetryCount: 3,
  
  // 缓存策略
  provider: () => new Map(),
};

/**
 * 带认证的 fetcher
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  // 根据 URL 映射到对应的 API 方法
  const methodMap: Record<string, () => Promise<T>> = {
    '/api/agents': () => api.getAgents() as Promise<T>,
    '/api/tasks': () => api.getTasks() as Promise<T>,
    '/api/runs': () => api.getRuns() as Promise<T>,
  };
  
  const method = methodMap[url];
  if (!method) {
    throw new Error(`Unknown API endpoint: ${url}`);
  }
  
  return method();
};

/**
 * 带参数的 fetcher
 */
export const fetcherWithParams = async <T, P extends Record<string, unknown>>(
  url: string,
  params: P
): Promise<T> => {
  if (url === '/api/agent-tokens' && 'agentId' in params) {
    return api.getAgentTokens(params.agentId as string) as Promise<T>;
  }
  
  if (url === '/api/token-feedback' && 'tokenId' in params) {
    return api.getTokenFeedback(params.tokenId as string) as Promise<T>;
  }
  
  throw new Error(`Unknown API endpoint: ${url}`);
};

/**
 * 轮询配置（用于实时数据）
 */
export const pollingConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 5000,  // 5秒轮询
  revalidateOnFocus: true,
};

/**
 * 一次性配置（用于不经常变化的数据）
 */
export const staticConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,  // 1分钟
};
