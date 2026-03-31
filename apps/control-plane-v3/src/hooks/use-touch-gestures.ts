'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

interface SwipeConfig {
  threshold?: number;
  velocityThreshold?: number;
}

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onLongPress?: () => void;
}

export function useTouchGestures(
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) {
  const { threshold = 50, velocityThreshold = 0.3 } = config;
  
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = null;
    isLongPress.current = false;

    // 长按检测
    if (handlers.onLongPress) {
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        handlers.onLongPress?.();
      }, 500);
    }
  }, [handlers]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // 移动超过阈值时取消长按
    if (touchStart.current) {
      const diffX = Math.abs(touch.clientX - touchStart.current.x);
      const diffY = Math.abs(touch.clientY - touchStart.current.y);
      if (diffX > 10 || diffY > 10) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    // 清除长按定时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // 如果是长按，不处理其他手势
    if (isLongPress.current) {
      return;
    }

    if (!touchStart.current || !touchEnd.current) {
      // 点击（没有移动）
      if (touchStart.current && !touchEnd.current) {
        handlers.onTap?.();
      }
      return;
    }

    const startX = touchStart.current.x;
    const startY = touchStart.current.y;
    const endX = touchEnd.current.x;
    const endY = touchEnd.current.y;
    const startTime = touchStart.current.time;
    const endTime = touchEnd.current.time;

    const diffX = endX - startX;
    const diffY = endY - startY;
    const duration = endTime - startTime;
    // 防止除零错误
    const safeDuration = duration > 0 ? duration : 1;
    const velocityX = Math.abs(diffX) / safeDuration;
    const velocityY = Math.abs(diffY) / safeDuration;

    // 检测水平滑动
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > threshold && velocityX > velocityThreshold) {
        if (diffX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      }
    } else {
      // 检测垂直滑动
      if (Math.abs(diffY) > threshold && velocityY > velocityThreshold) {
        if (diffY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    }

    touchStart.current = null;
    touchEnd.current = null;
  }, [handlers, threshold, velocityThreshold]);

  // 清理
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}// 专用 Hook - 侧边栏滑动手势
export function useSidebarSwipe(onOpen: () => void, onClose: () => void, isOpen: boolean) {
  return useTouchGestures({
    onSwipeRight: () => {
      if (!isOpen) onOpen();
    },
    onSwipeLeft: () => {
      if (isOpen) onClose();
    },
  }, {
    threshold: 80,
    velocityThreshold: 0.2,
  });
}

// 专用 Hook - 下拉刷新
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const pullDistance = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      pullDistance.current = currentY - pullStartY.current;
      
      // 阻力效果 - 只在下拉超过阈值时阻止默认行为
      if (pullDistance.current > 10) {
        e.preventDefault();
      }
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullDistance.current > 80 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    pullStartY.current = 0;
    pullDistance.current = 0;
  }, [onRefresh, isRefreshing]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isRefreshing,
    pullDistance: pullDistance.current,
  };
}


