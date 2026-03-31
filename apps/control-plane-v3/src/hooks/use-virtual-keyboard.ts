'use client';

import { useState, useEffect, useCallback } from 'react';

interface VirtualKeyboardState {
  isOpen: boolean;
  height: number;
}

export function useVirtualKeyboard(): VirtualKeyboardState {
  const [state, setState] = useState<VirtualKeyboardState>({
    isOpen: false,
    height: 0,
  });

  useEffect(() => {
    // 检测虚拟键盘打开（通过视口高度变化）
    let originalHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = originalHeight - currentHeight;
      
      // 如果高度差大于 200px，认为是虚拟键盘打开
      if (heightDiff > 200) {
        setState({ isOpen: true, height: heightDiff });
      } else {
        setState({ isOpen: false, height: 0 });
        // 更新原始高度（处理窗口大小变化）
        if (currentHeight > originalHeight - 100) {
          originalHeight = currentHeight;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    // 监听焦点事件
    const handleFocus = () => {
      setTimeout(handleResize, 100);
    };
    
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
    };
  }, []);

  return state;
}

// 自动滚动输入框到可视区域
export function useInputScroll() {
  const scrollIntoView = useCallback((element: HTMLElement) => {
    // 延迟执行，等待虚拟键盘打开
    setTimeout(() => {
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

  useEffect(() => {
    let originalHeight = window.innerHeight;
    
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = originalHeight - currentHeight;
      
      if (heightDiff > 200) {
        // 虚拟键盘打开，调整底部位置
        setBottomOffset(heightDiff);
      } else {
        setBottomOffset(0);
        // 更新原始高度（处理窗口大小变化）
        if (currentHeight > originalHeight - 100) {
          originalHeight = currentHeight;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return bottomOffset;
}
