/**
 * useNotifications - 通知数据管理 Hook
 * 
 * 使用 SWR 管理通知数据，支持真实后端或降级到本地状态
 */

'use client';

import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { logger } from '@/lib/logger';

export type NotificationType = 'agent' | 'human' | 'system' | 'warning' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread: number;
}

export type NotificationsSource =
  | {
      kind: 'backend';
      endpoint: string;
    }
  | {
      kind: 'unavailable';
      reason: string;
    };

const NOTIFICATIONS_KEY = '/api/notifications';
const API_BASE_URL = '/api';
const NOTIFICATIONS_SOURCE: NotificationsSource = {
  kind: 'unavailable',
  reason: 'Notifications are not available in this control plane yet.',
};

type FetchLike = typeof fetch;

export function getNotificationsSource(): NotificationsSource {
  return NOTIFICATIONS_SOURCE;
}

export function getNotificationsSWRKey(source: NotificationsSource): string | null {
  return source.kind === 'backend' ? NOTIFICATIONS_KEY : null;
}

// 获取通知的 fetcher - 直接使用 fetch 以获得更好的类型控制
export async function loadNotifications(
  source: NotificationsSource,
  fetchImpl: FetchLike = fetch,
): Promise<Notification[]> {
  if (source.kind === 'unavailable') {
    logger.notifications.info(source.reason);
    return [];
  }

  try {
    const response = await fetchImpl(source.endpoint, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      // 如果 API 不可用，返回空数组（降级）
      if (response.status === 404 || response.status === 501) {
        logger.notifications.info('Backend not available, returning empty list');
        return [];
      }
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    const data = (await response.json()) as NotificationsResponse;
    return data.notifications || [];
  } catch (error) {
    logger.notifications.error('Fetch error:', error);
    // 降级：返回空数组
    return [];
  }
}

/**
 * 获取通知列表
 */
export function useNotifications() {
  const source = getNotificationsSource();
  const swrKey = getNotificationsSWRKey(source);
  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    swrKey,
    () => loadNotifications(source),
    {
      refreshInterval: 30000, // 30秒刷新一次
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  return {
    availability: source.kind,
    unavailableReason: source.kind === 'unavailable' ? source.reason : null,
    notifications: data ?? [],
    isLoading: swrKey ? isLoading : false,
    error: swrKey ? error : null,
    mutate,
  };
}

/**
 * 标记通知已读
 */
export async function markAllNotificationsReadForSource(
  source: NotificationsSource,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  if (source.kind === 'unavailable') {
    logger.notifications.info('Notifications unavailable; skipping mark-all-read');
    return;
  }

  try {
    const response = await fetchImpl(`${API_BASE_URL}/notifications/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
      credentials: 'include',
    });

    if (!response.ok) {
      // 如果 API 不存在，静默失败（前端本地标记）
      if (response.status === 404 || response.status === 501) {
        logger.notifications.info('Mark read API not available');
        // 乐观更新本地状态
        await globalMutate(
          NOTIFICATIONS_KEY,
          (notifications: Notification[] | undefined) =>
            notifications?.map(n => ({ ...n, read: true })) ?? [],
          false
        );
        return;
      }
      throw new Error(`Failed to mark notifications read: ${response.status}`);
    }
  } catch (error) {
    logger.notifications.error('Mark read error:', error);
    throw error;
  }
}

async function markNotificationReadForSource(
  id: string,
  source: NotificationsSource,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  if (source.kind === 'unavailable') {
    logger.notifications.info('Notifications unavailable; skipping mark-one-read');
    return;
  }

  try {
    const response = await fetchImpl(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 501) {
        // 乐观更新
        await globalMutate(
          NOTIFICATIONS_KEY,
          (notifications: Notification[] | undefined) =>
            notifications?.map(n =>
              n.id === id ? { ...n, read: true } : n
            ) ?? [],
          false
        );
        return;
      }
      throw new Error(`Failed to mark notification read: ${response.status}`);
    }
  } catch (error) {
    logger.notifications.error('Mark one read error:', error);
    throw error;
  }
}

export function useMarkNotificationsRead() {
  const source = getNotificationsSource();

  // 使用本地状态管理标记过程
  const [isMarking, setIsMarking] = useState(false);

  const markAllReadWithState = async () => {
    if (source.kind === 'unavailable') {
      return;
    }
    setIsMarking(true);
    try {
      await markAllNotificationsReadForSource(source);
    } finally {
      setIsMarking(false);
    }
  };

  return {
    markAllRead: markAllReadWithState,
    markOneRead: (id: string) => markNotificationReadForSource(id, source),
    isMarking,
  };
}
