'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useGlobalSearch } from '@/domains/search';
import type { SearchResultItem } from '@/domains/search';
import { useI18n } from '@/components/i18n-provider';

interface GlobalSearchProps {
  className?: string;
}

const SEARCH_GROUP_KEYS = ['identities', 'tasks', 'assets', 'skills', 'events'] as const;

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
      return 'bg-[var(--kw-green-surface)] dark:bg-[var(--kw-dark-green-accent-surface)] text-[var(--kw-green-text)] dark:text-[var(--kw-dark-mint)]';
    case 'task':
      return 'bg-[var(--kw-amber-surface)] dark:bg-[var(--kw-dark-amber-surface)] text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]';
    case 'secret':
      return 'bg-[var(--kw-sky-surface)] dark:bg-[var(--kw-dark-sky-accent-surface)] text-[var(--kw-sky-text)] dark:text-[var(--kw-dark-sky)]';
    case 'capability':
      return 'bg-[var(--kw-purple-surface)] dark:bg-[var(--kw-dark-purple-accent-surface)] text-[var(--kw-purple-text)] dark:text-[var(--kw-dark-primary)]';
    case 'event':
      return 'bg-[var(--kw-rose-surface)] dark:bg-[var(--kw-dark-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-dark-primary)]';
    default:
      return 'bg-[var(--kw-surface-alt)] dark:bg-[var(--kw-dark-border)] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text)]';
  }
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const { t } = useI18n();
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
      SEARCH_GROUP_KEYS.map((key) => ({
        key,
        label: t(`globalSearch.groups.${key}`),
        items: results[key],
      })).filter((group) => group.items.length > 0),
    [results, t]
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
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kw-text-muted)]"
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
          placeholder={t('globalSearch.placeholder')}
          aria-label={t('globalSearch.ariaLabel')}
          className="bg-[var(--kw-surface-alt)]/80 dark:bg-[var(--kw-dark-bg)]/80 dark:focus:ring-[var(--kw-dark-primary)]/50 w-full rounded-full border-none py-2 pl-11 pr-12 text-sm text-[var(--kw-text)] transition-colors transition-shadow focus:bg-white focus:ring-2 focus:ring-[var(--kw-primary-300)] dark:text-[var(--kw-dark-text)] dark:focus:bg-[var(--kw-dark-bg)]"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-[var(--kw-border)] bg-white px-2 py-0.5 text-xs text-[var(--kw-text-muted)] md:flex dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text-muted)]">
          <Command className="h-3 w-3" aria-hidden="true" />
          <span>K</span>
        </kbd>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[var(--kw-border)] bg-white shadow-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 p-4 text-[var(--kw-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('globalSearch.searching')}</span>
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-[var(--kw-error)] dark:text-[var(--kw-error)]">
              {error instanceof Error ? error.message : t('globalSearch.searchFailed')}
            </div>
          )}

          {!isLoading && !error && groupedResults.length > 0 && (
            <div className="py-2">
              {groupedResults.map((group) => (
                <div key={group.key} className="px-2 pb-2">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--kw-text-muted)]">
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
            <div className="p-4 text-center text-[var(--kw-text-muted)]">
              <p className="text-sm">{t('globalSearch.noResults')}</p>
              <p className="mt-1 text-xs">{t('globalSearch.noResultsHint')}</p>
            </div>
          )}

          {!hasQuery && (
            <div className="p-4 text-sm text-[var(--kw-text-muted)]">
              <p className="mb-1 font-medium">{t('globalSearch.searchTipsTitle')}</p>
              <ul className="space-y-1 text-xs">
                <li>• {t('globalSearch.searchTip1')}</li>
                <li>• {t('globalSearch.searchTip2')}</li>
                <li>• {t('globalSearch.searchTip3')}</li>
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
        selected && 'bg-[var(--kw-primary-50)] dark:bg-[var(--kw-dark-border)]',
        'hover:bg-[var(--kw-primary-50)]/50 dark:hover:bg-[var(--kw-dark-surface-alt)]/50'
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
        <p className="font-medium text-[var(--kw-text)]">{result.title}</p>
        <p className="truncate text-sm text-[var(--kw-text-muted)]">{result.subtitle}</p>
      </div>
    </button>
  );
}
