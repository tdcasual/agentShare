/**
 * SWR 全局配置
 *
 * 提供：
 * - 默认配置
 * - 错误重试策略
 */

import { SWRConfiguration } from 'swr';
import { useEffect, useState } from 'react';
import { ApiError } from './vaultgate-api';

/**
 * 全局 SWR 配置
 */
export const swrConfig: SWRConfiguration = {
  // 数据刷新策略
  revalidateOnFocus: false, // 窗口聚焦时不刷新
  revalidateOnReconnect: true, // 网络恢复时刷新
  refreshInterval: 0, // 默认不自动轮询
  dedupingInterval: 2000, // 2秒内重复请求去重

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
 * 页面可见性状态 hook
 * 当 tab 隐藏时返回 false，可用于暂停轮询
 */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(typeof document !== 'undefined' ? !document.hidden : true);

  useEffect(() => {
    const handleVisibilityChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return visible;
}

/**
 * 轮询配置（用于实时数据）
 */
export const pollingConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 5000, // 5秒轮询
  revalidateOnFocus: true,
};

/**
 * 一次性配置（用于不经常变化的数据）
 */
export const staticConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1分钟
};
