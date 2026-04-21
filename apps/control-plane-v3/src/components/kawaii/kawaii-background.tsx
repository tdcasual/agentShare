'use client';

import { memo } from 'react';
import { useTheme } from 'next-themes';

export const KawaiiBackground = memo(function KawaiiBackground() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="pointer-events-none fixed inset-0 z-background overflow-hidden">
      {/* Subtle gradient overlay */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          isDark
            ? 'via-[var(--kw-dark-surface)]/50 bg-gradient-to-br from-[var(--kw-dark-bg)] to-[var(--kw-dark-bg)]'
            : 'from-[var(--kw-surface-alt)]/60 via-[var(--kw-bg)]/80 to-[var(--kw-sky-surface)]/40 bg-gradient-to-br'
        }`}
      />

      {/* Subtle orb decorations - very soft */}
      <div
        className={`absolute left-1/4 top-1/4 h-64 w-64 rounded-full blur-3xl transition-colors duration-500 ${
          isDark ? 'bg-[var(--kw-dark-primary)]/3' : 'bg-[var(--kw-primary-200)]/10'
        }`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full blur-3xl transition-colors duration-500 ${
          isDark ? 'bg-[var(--kw-dark-sky)]/3' : 'bg-[var(--kw-lavender)]/20'
        }`}
        style={{ animationDelay: '1s' }}
      />
    </div>
  );
});
