'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Command, Key, Search, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

interface GlobalSearchProps {
  className?: string;
}

interface QuickLink {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
}

function useQuickLinks(): QuickLink[] {
  const { t } = useI18n();
  return useMemo(
    () => [
      {
        id: 'secrets',
        title: t('navigation.secrets'),
        subtitle: t('secrets.description'),
        href: '/secrets',
        icon: <Shield className="h-4 w-4" />,
      },
      {
        id: 'tokens',
        title: t('navigation.tokens'),
        subtitle: t('tokens.description'),
        href: '/tokens',
        icon: <Key className="h-4 w-4" />,
      },
    ],
    [t]
  );
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const quickLinks = useQuickLinks();

  const filteredLinks = useMemo(() => {
    return quickLinks;
  }, [quickLinks]);

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

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
      setIsOpen(false);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && filteredLinks.length > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredLinks.length);
    } else if (e.key === 'ArrowUp' && filteredLinks.length > 0) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredLinks.length) % filteredLinks.length);
    } else if (e.key === 'Enter' && filteredLinks[selectedIndex]) {
      e.preventDefault();
      handleNavigate(filteredLinks[selectedIndex].href);
    }
  };

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
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('globalSearch.placeholder')}
          aria-label={t('globalSearch.ariaLabel')}
          className="bg-[var(--kw-surface-alt)]/80 dark:bg-[var(--kw-dark-bg)]/80 dark:focus:ring-[var(--kw-dark-primary)]/50 w-full rounded-full border-none py-2 pl-11 pr-12 text-sm text-[var(--kw-text)] transition-colors transition-shadow focus:bg-[var(--kw-surface)] focus:ring-2 focus:ring-[var(--kw-primary-300)] dark:text-[var(--kw-dark-text)] dark:focus:bg-[var(--kw-dark-surface)]"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-[var(--kw-border)] bg-[var(--kw-surface)] px-2 py-0.5 text-xs text-[var(--kw-text-muted)] md:flex dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text-muted)]">
          <Command className="h-3 w-3" aria-hidden="true" />
          <span>K</span>
        </kbd>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-dropdown mt-2 max-h-[50vh] overflow-hidden overflow-y-auto rounded-2xl border border-[var(--kw-border)] bg-[var(--kw-surface)] shadow-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
          <div className="py-2">
            {filteredLinks.map((link, index) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavigate(link.href)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                  index === selectedIndex && 'bg-[var(--kw-primary-50)] dark:bg-[var(--kw-dark-border)]',
                  'hover:bg-[var(--kw-primary-50)]/50 dark:hover:bg-[var(--kw-dark-surface-alt)]/50'
                )}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)] dark:bg-[var(--kw-dark-sky-accent-surface)] dark:text-[var(--kw-dark-sky)]">
                  {link.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--kw-text)]">{link.title}</p>
                  <p className="truncate text-sm text-[var(--kw-text-muted)]">{link.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--kw-border)] p-3 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)]">
            <p>{t('globalSearch.searchTipsTitle')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
