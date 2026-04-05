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
        // 如果开始移动，重置 touchStart 以防止误触发点击
        if (diffX > 10 || diffY > 10) {
          isLongPress.current = false;
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
      if (!isOpen) {onOpen();}
    },
    onSwipeLeft: () => {
      if (isOpen) {onClose();}
    },
  }, {
    threshold: 80,
    velocityThreshold: 0.2,
  });
}

// 专用 Hook - 下拉刷新
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef(0);
  const pullDistanceRef = useRef(0);
  const isMounted = useRef(true);

  // 清理
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // 只在页面顶部且未在刷新时开始下拉
    if (window.scrollY === 0 && !isRefreshing) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, [isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (pullStartY.current > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY.current;
      
      // 阻力效果 - 只处理向下拉动
      if (distance > 0) {
        // 应用阻力系数
        const resistedDistance = Math.min(distance * 0.5, 150);
        pullDistanceRef.current = resistedDistance;
        setPullDistance(resistedDistance);
        
        // 阻止默认行为（需要确保事件不是 passive 的）
        if (distance > 10) {
          e.preventDefault();
        }
      }
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullDistanceRef.current > 80 && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        // 错误处理：静默失败或可以添加错误回调
        console.error('Pull to refresh failed:', error);
      } finally {
        // 检查组件是否仍然挂载
        if (isMounted.current) {
          setIsRefreshing(false);
        }
      }
    }
    pullStartY.current = 0;
    pullDistanceRef.current = 0;
    setPullDistance(0);
  }, [onRefresh, isRefreshing]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isRefreshing,
    pullDistance,
  };
}


