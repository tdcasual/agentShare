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
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200',
            'bg-white/80 dark:bg-[#252540]/80 border border-pink-200 dark:border-[#3D3D5C]',
            'hover:bg-pink-50 dark:hover:bg-[#2D2D50]',
            'text-gray-700 dark:text-[#E8E8EC]'
          )}
          title={`${localeFlags[locale as Locale]} ${localeLabels[locale as Locale]}`}
        >
          <span className="text-base">{localeFlags[locale as Locale]}</span>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div
              className={cn(
                'absolute right-0 top-full mt-2 z-50',
                'w-32 rounded-2xl overflow-hidden',
                'bg-white dark:bg-[#252540]',
                'border border-pink-200 dark:border-[#3D3D5C]',
                'shadow-lg shadow-pink-500/10 dark:shadow-black/30',
                'animate-slide-up'
              )}
            >
              {locales.map((l) => (
                <button
                  key={l}
                  onClick={() => handleLocaleChange(l)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 text-left',
                    'transition-colors duration-200',
                    'hover:bg-pink-50 dark:hover:bg-[#2D2D50]',
                    locale === l && 'bg-pink-50 dark:bg-[#2D2D50] text-pink-600 dark:text-pink-400'
                  )}
                >
                  <span className="text-base">{localeFlags[l]}</span>
                  <span className={cn(
                    'text-sm font-medium',
                    locale === l ? 'text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-[#E8E8EC]'
                  )}>
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
          'flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200',
          'bg-white/80 dark:bg-[#252540]/80 border border-pink-200 dark:border-[#3D3D5C]',
          'hover:bg-pink-50 dark:hover:bg-[#2D2D50]',
          'text-gray-700 dark:text-[#E8E8EC]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]'
        )}
      >
        <Globe className="w-4 h-4 text-pink-500" />
        <span className="text-sm font-medium">
          {localeFlags[locale as Locale]} {localeLabels[locale as Locale]}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              'absolute right-0 top-full mt-2 z-50',
              'w-40 rounded-2xl overflow-hidden',
              'bg-white dark:bg-[#252540]',
              'border border-pink-200 dark:border-[#3D3D5C]',
              'shadow-lg shadow-pink-500/10 dark:shadow-black/30',
              'animate-slide-up'
            )}
          >
            {locales.map((l) => (
              <button
                key={l}
                onClick={() => handleLocaleChange(l)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left',
                  'transition-colors duration-200',
                  'hover:bg-pink-50 dark:hover:bg-[#2D2D50]',
                  locale === l && 'bg-pink-50 dark:bg-[#2D2D50] text-pink-600 dark:text-pink-400'
                )}
              >
                <span className="text-lg">{localeFlags[l]}</span>
                <span className={cn(
                  'text-sm font-medium',
                  locale === l ? 'text-pink-600 dark:text-pink-400' : 'text-gray-700 dark:text-[#E8E8EC]'
                )}>
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
