'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { Globe, ChevronDown } from 'lucide-react';
import { locales, type Locale, localeLabels, localeFlags } from '@/i18n/config';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  function handleLocaleChange(newLocale: Locale) {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }
    setLocale(newLocale);
  }

  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200',
            'border border-[var(--kw-primary-200)] bg-white/80 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80',
            'hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-surface-alt)]',
            'text-[var(--kw-text)]'
          )}
          title={`${localeFlags[locale as Locale]} ${localeLabels[locale as Locale]}`}
        >
          <span className="text-base">{localeFlags[locale as Locale]}</span>
        </button>

        {isOpen && (
          <>
            <button
              className="fixed inset-0 z-40"
              aria-label="Close language menu"
              type="button"
              onClick={() => setIsOpen(false)}
            />
            <div
              className={cn(
                'absolute right-0 top-full z-50 mt-2',
                'w-32 overflow-hidden rounded-2xl',
                'bg-[var(--kw-surface)] dark:bg-[var(--kw-dark-surface)]',
                'border border-[var(--kw-primary-200)] dark:border-[var(--kw-dark-border)]',
                'shadow-lg shadow-[var(--kw-primary-500)]/10 dark:shadow-black/30',
                'animate-slide-up'
              )}
            >
              {locales.map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => handleLocaleChange(l)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left',
                    'transition-colors duration-200',
                    'hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-surface-alt)]',
                    locale === l && 'bg-[var(--kw-primary-50)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-surface-alt)] dark:text-[var(--kw-dark-primary)]'
                  )}
                >
                  <span className="text-base">{localeFlags[l]}</span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      locale === l
                        ? 'text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]'
                        : 'text-[var(--kw-text)]'
                    )}
                  >
                    {localeLabels[l]}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('common.switchLanguage') || 'Switch language'}
        type="button"
        className={cn(
          'flex items-center gap-2 rounded-full px-3 py-2 transition-colors duration-200',
          'border border-[var(--kw-primary-200)] bg-white/80 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80',
          'hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-surface-alt)]',
          'text-[var(--kw-text)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]'
        )}
      >
        <Globe className="h-4 w-4 text-[var(--kw-primary-500)]" />
        <span className="text-sm font-medium">
          {localeFlags[locale as Locale]} {localeLabels[locale as Locale]}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <button
            className="fixed inset-0 z-40"
            aria-label="Close language menu"
            type="button"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              'absolute right-0 top-full z-50 mt-2',
              'w-40 overflow-hidden rounded-2xl',
              'bg-[var(--kw-surface)] dark:bg-[var(--kw-dark-surface)]',
              'border border-[var(--kw-primary-200)] dark:border-[var(--kw-dark-border)]',
              'shadow-lg shadow-[var(--kw-primary-500)]/10 dark:shadow-black/30',
              'animate-slide-up'
            )}
          >
            {locales.map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => handleLocaleChange(l)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left',
                  'transition-colors duration-200',
                  'hover:bg-[var(--kw-primary-50)] dark:hover:bg-[var(--kw-dark-surface-alt)]',
                  locale === l && 'bg-[var(--kw-primary-50)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-surface-alt)] dark:text-[var(--kw-dark-primary)]'
                )}
              >
                <span className="text-lg">{localeFlags[l]}</span>
                <span
                  className={cn(
                    'text-sm font-medium',
                    locale === l
                      ? 'text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]'
                      : 'text-[var(--kw-text)]'
                  )}
                >
                  {localeLabels[l]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
