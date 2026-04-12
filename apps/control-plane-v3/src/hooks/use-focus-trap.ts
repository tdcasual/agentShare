/**
 * useFocusTrap - 焦点陷阱 Hook
 *
 * 用于模态框、下拉菜单等需要限制焦点在容器内的场景
 * 支持 ESC 键关闭和 Tab 循环导航
 */

'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

interface UseFocusTrapOptions {
  isActive: boolean;
  onEscape?: () => void;
  onFocusOutside?: () => void;
  returnFocusOnDeactivate?: boolean;
}

interface UseFocusTrapReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export function useFocusTrap({
  isActive,
  onEscape,
  onFocusOutside,
  returnFocusOnDeactivate = true,
}: UseFocusTrapOptions): UseFocusTrapReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onEscapeRef = useRef(onEscape);
  const onFocusOutsideRef = useRef(onFocusOutside);

  useLayoutEffect(() => {
    onEscapeRef.current = onEscape;
    onFocusOutsideRef.current = onFocusOutside;
  });

  // 保存触发前的焦点
  useEffect(() => {
    if (isActive && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
      triggerRef.current = document.activeElement;
    }
  }, [isActive]);

  // 管理焦点陷阱
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    // 获取所有可聚焦元素
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]',
      ].join(', ');

      return Array.from(container.querySelectorAll(selector)).filter((el): el is HTMLElement => {
        // 过滤不可见元素
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    };

    // 聚焦第一个元素
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // 延迟聚焦以确保元素已渲染
      timeoutRef.current = setTimeout(() => {
        const firstElement = focusableElements[0];
        firstElement?.focus();
      }, 0);
    }

    // 键盘事件处理
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscapeRef.current) {
        e.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (e.key !== 'Tab') {
        return;
      }

      const elements = getFocusableElements();
      if (elements.length === 0) {
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // 点击外部处理
    const handleClickOutside = (e: MouseEvent) => {
      if (
        onFocusOutsideRef.current &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onFocusOutsideRef.current();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);

      // 清理延迟聚焦定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // 恢复焦点
      if (returnFocusOnDeactivate && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, returnFocusOnDeactivate]);

  return { containerRef, triggerRef };
}

/**
 * 简化的焦点陷阱 Hook（仅 ESC 关闭）
 */
export function useEscapeKey(isActive: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onEscape]);
}

/**
 * 点击外部 Hook
 */
export function useClickOutside(
  isActive: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  excludeRefs?: React.RefObject<HTMLElement | null>[]
): void {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;

      // 检查是否在容器内
      if (containerRef.current?.contains(target)) {
        return;
      }

      // 检查是否在排除列表中
      const isExcluded = excludeRefs?.some((ref) => ref.current?.contains(target));
      if (isExcluded) {
        return;
      }

      onClickOutside();
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isActive, containerRef, onClickOutside, excludeRefs]);
}
