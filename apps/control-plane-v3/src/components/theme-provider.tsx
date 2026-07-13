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
    const hslChannels = getComputedStyle(root).getPropertyValue('--background').trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && hslChannels) {
      meta.setAttribute('content', `hsl(${hslChannels})`);
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
