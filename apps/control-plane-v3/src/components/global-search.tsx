'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useGlobalSearch } from '@/domains/search';
import type { SearchResultItem } from '@/domains/search';

interface GlobalSearchProps {
  className?: string;
}

const SEARCH_GROUPS = [
  { key: 'identities', label: 'Identities' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'assets', label: 'Assets' },
  { key: 'skills', label: 'Skills' },
  { key: 'events', label: 'Events' },
] as const;

function getResultIcon(kind: string) {
  switch (kind) {
    case 'agent':
      return '🤖';
    case 'task':
      return '📋';
    case 'secret':
      return '📦';
    case 'capability':
      return '🧠';
    case 'event':
      return '🔔';
    default:
      return '✨';
  }
}

function getResultColors(kind: string) {
  switch (kind) {
    case 'agent':
      return 'bg-green-100 dark:bg-[#2D4A3D] text-green-600 dark:text-green-400';
    case 'task':
      return 'bg-amber-100 dark:bg-[#4A3D2D] text-amber-600 dark:text-amber-400';
    case 'secret':
      return 'bg-sky-100 dark:bg-[#2D4A5D] text-sky-600 dark:text-sky-400';
    case 'capability':
      return 'bg-purple-100 dark:bg-[#3D2D4A] text-purple-600 dark:text-purple-400';
    case 'event':
      return 'bg-rose-100 dark:bg-[#4A2D40] text-rose-600 dark:text-rose-300';
    default:
      return 'bg-gray-100 dark:bg-[#3D3D5C] text-gray-600 dark:text-[#E8E8EC]';
  }
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);
  const { results, isLoading, error, hasQuery } = useGlobalSearch(debouncedQuery);

  const groupedResults = useMemo(
    () =>
      SEARCH_GROUPS.map((group) => ({
        ...group,
        items: results[group.key],
      })).filter((group) => group.items.length > 0),
    [results]
  );

  const flatResults = useMemo(
    () => groupedResults.flatMap((group) => group.items),
    [groupedResults]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && flatResults.length > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp' && flatResults.length > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault();
      const result = flatResults[selectedIndex];
      router.push(result.href);
      setIsOpen(false);
      setQuery('');
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#9CA3AF]"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search assets, skills, identities, and events..."
          aria-label="Search assets, skills, identities, and events"
          className="w-full rounded-full border-none bg-gray-100/80 py-2 pl-11 pr-12 text-sm text-gray-800 transition-all focus:bg-white focus:ring-2 focus:ring-pink-300 dark:bg-[#1A1A2E]/80 dark:text-[#E8E8EC] dark:focus:bg-[#1A1A2E] dark:focus:ring-[#E891C0]/50"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-400 md:flex dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#9CA3AF]">
          <Command className="h-3 w-3" aria-hidden="true" />
          <span>K</span>
        </kbd>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl dark:border-[#3D3D5C] dark:bg-[#252540]">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-4 text-gray-500 dark:text-[#9CA3AF]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : 'Search failed'}
            </div>
          )}

          {!isLoading && !error && groupedResults.length > 0 && (
            <div className="py-2">
              {groupedResults.map((group) => (
                <div key={group.key} className="px-2 pb-2">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-[#9CA3AF]">
                    {group.label}
                  </p>
                  {group.items.map((result) => {
                    const itemIndex = flatResults.findIndex(
                      (item) => item.id === result.id && item.kind === result.kind
                    );
                    return (
                      <SearchResultButton
                        key={`${group.key}-${result.id}`}
                        result={result}
                        selected={itemIndex === selectedIndex}
                        onSelect={() => {
                          router.push(result.href);
                          setIsOpen(false);
                          setQuery('');
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && hasQuery && groupedResults.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-[#9CA3AF]">
              <p className="text-sm">No results found</p>
              <p className="mt-1 text-xs">
                Try an agent name, asset provider, skill name, or event keyword.
              </p>
            </div>
          )}

          {!hasQuery && (
            <div className="p-4 text-sm text-gray-500 dark:text-[#9CA3AF]">
              <p className="mb-1 font-medium">Search tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Search across assets, skills, identities, tasks, and inbox events</li>
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

function SearchResultButton({
  result,
  selected,
  onSelect,
}: {
  result: SearchResultItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
        selected && 'bg-pink-50 dark:bg-[#3D3D5C]',
        'hover:bg-pink-50/50 dark:hover:bg-[#3D3D5C]/50'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          getResultColors(result.kind)
        )}
      >
        {getResultIcon(result.kind)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">{result.title}</p>
        <p className="truncate text-sm text-gray-500 dark:text-[#9CA3AF]">{result.subtitle}</p>
      </div>
    </button>
  );
}
