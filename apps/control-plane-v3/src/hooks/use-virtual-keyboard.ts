'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface VirtualKeyboardState {
  isOpen: boolean;
  height: number;
}

export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>({
    isOpen: false,
    height: 0,
  });
  // 使用 ref 存储原始高度，避免闭包问题
  const originalHeightRef = useRef<number>(0);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 在 effect 中初始化，确保在客户端执行
    originalHeightRef.current = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = originalHeightRef.current - currentHeight;
      
      // 如果高度差大于 200px，认为是虚拟键盘打开
      if (heightDiff > 200) {
        setState({ isOpen: true, height: heightDiff });
      } else {
        setState({ isOpen: false, height: 0 });
        // 更新原始高度（处理窗口大小变化）
        if (currentHeight > originalHeightRef.current - 100) {
          originalHeightRef.current = currentHeight;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // 监听焦点事件
    const handleFocus = () => {
      // 清理之前的定时器
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      focusTimeoutRef.current = setTimeout(handleResize, 100);
    };
    
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
      // 清理定时器
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  return state;
}

// 自动滚动输入框到可视区域
export function useInputScroll() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清理函数
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scrollIntoView = useCallback((element: HTMLElement) => {
    // 清理之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 延迟执行，等待虚拟键盘打开
    timeoutRef.current = setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const visibleHeight = window.innerHeight;
      
      // 如果输入框在可视区域下方，滚动到可视区域
      if (rect.bottom > visibleHeight - 100) {
        const scrollY = window.scrollY + (rect.bottom - visibleHeight) + 100;
        window.scrollTo({ top: scrollY, behavior: 'smooth' });
      }
    }, 300);
  }, []);

  return { scrollIntoView };
}

// 防止底部固定元素被虚拟键盘顶起
export function useFixedBottomAdjust() {
  const [bottomOffset, setBottomOffset] = useState(0);
  const originalHeightRef = useRef<number>(0);

  useEffect(() => {
    // 在 effect 中初始化
    originalHeightRef.current = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = originalHeightRef.current - currentHeight;
      
      if (heightDiff > 200) {
        // 虚拟键盘打开，调整底部位置
        setBottomOffset(heightDiff);
      } else {
        setBottomOffset(0);
        // 更新原始高度（处理窗口大小变化）
        if (currentHeight > originalHeightRef.current - 100) {
          originalHeightRef.current = currentHeight;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return bottomOffset;
}
