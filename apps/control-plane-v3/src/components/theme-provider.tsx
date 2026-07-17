'use client';

import { useEffect } from 'react';
import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from 'next-themes';

/**
 * Sync the browser theme-color meta tag with the active CSS background token.
 * This avoids hard-coding colors in layout metadata and keeps the browser chrome
 * consistent when the user toggles light/dark mode.
 */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const oklchChannels = getComputedStyle(root).getPropertyValue('--background').trim();
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.append(meta);
    }
    if (oklchChannels) {
      meta.setAttribute('content', `oklch(${oklchChannels})`);
    }
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}
