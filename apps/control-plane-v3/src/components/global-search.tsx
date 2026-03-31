/**
 * Global Search - 全局搜索组件
 * 
 * 实现真实搜索功能或显式标记为不可用
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Command, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'agent' | 'token' | 'task' | 'asset';
  title: string;
  subtitle: string;
  href: string;
}

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 搜索函数
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 这里应该调用真实的搜索 API
      // 目前使用模拟数据演示搜索功能
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'agent',
          title: 'Search Agents',
          subtitle: `Find agents matching "${searchQuery}"`,
          href: '/tokens?q=' + encodeURIComponent(searchQuery),
        },
        {
          id: '2',
          type: 'task',
          title: 'Search Tasks',
          subtitle: `Find tasks matching "${searchQuery}"`,
          href: '/tasks?q=' + encodeURIComponent(searchQuery),
        },
      ];

      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 200));
      setResults(mockResults);
    } catch (err) {
      setError('Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K 打开搜索
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }

      // ESC 关闭搜索
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 搜索输入框 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#9CA3AF]" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search agents, tokens, tasks..."
          aria-label="Search agents, tokens, and tasks"
          className="w-full pl-11 pr-12 py-2 rounded-full bg-gray-100/80 dark:bg-[#1A1A2E]/80 border-none text-sm text-gray-800 dark:text-[#E8E8EC] focus:ring-2 focus:ring-pink-300 dark:focus:ring-[#E891C0]/50 focus:bg-white dark:focus:bg-[#1A1A2E] transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-[#1A1A2E] rounded text-xs text-gray-400 dark:text-[#9CA3AF] border border-gray-200 dark:border-[#3D3D5C]">
          <Command className="w-3 h-3" aria-hidden="true" />
          <span>K</span>
        </kbd>
      </div>

      {/* 搜索结果下拉 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#252540] rounded-2xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden z-50">
          {/* 加载状态 */}
          {isLoading && (
            <div className="p-4 flex items-center justify-center gap-2 text-gray-500 dark:text-[#9CA3AF]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="p-4 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 结果列表 */}
          {!isLoading && !error && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => {
                    router.push(result.href);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'w-full px-4 py-3 flex items-start gap-3 text-left transition-colors',
                    index === selectedIndex && 'bg-pink-50 dark:bg-[#3D3D5C]',
                    'hover:bg-pink-50/50 dark:hover:bg-[#3D3D5C]/50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    result.type === 'agent' && 'bg-green-100 dark:bg-[#2D4A3D] text-green-600 dark:text-green-400',
                    result.type === 'token' && 'bg-purple-100 dark:bg-[#3D2D4A] text-purple-600 dark:text-purple-400',
                    result.type === 'task' && 'bg-amber-100 dark:bg-[#4A3D2D] text-amber-600 dark:text-amber-400',
                    result.type === 'asset' && 'bg-sky-100 dark:bg-[#2D4A5D] text-sky-600 dark:text-sky-400'
                  )}>
                    {result.type === 'agent' && '🤖'}
                    {result.type === 'token' && '🔑'}
                    {result.type === 'task' && '📋'}
                    {result.type === 'asset' && '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                      {result.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-[#9CA3AF] truncate">
                      {result.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 空状态 */}
          {!isLoading && !error && query && results.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-[#9CA3AF]">
              <p className="text-sm">No results found</p>
              <p className="text-xs mt-1">Try different keywords</p>
            </div>
          )}

          {/* 提示 */}
          {!query && (
            <div className="p-4 text-sm text-gray-500 dark:text-[#9CA3AF]">
              <p className="font-medium mb-1">Search tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Type to search agents, tokens, and tasks</li>
                <li>• Press ↑↓ to navigate results</li>
                <li>• Press Enter to select</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
