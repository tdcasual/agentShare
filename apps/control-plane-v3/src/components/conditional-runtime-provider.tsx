'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { isDemoRoute } from '@/lib/route-policy';
import { RuntimeProvider } from './runtime-provider';
import { RuntimeContext } from '@/core/runtime';

interface ConditionalRuntimeProviderProps {
  children: React.ReactNode;
}

/**
 * Route-scoped runtime wrapper.
 *
 * - Demo routes initialize the full runtime context.
 * - Management and public routes skip runtime initialization;
 *   a null context is provided so hooks can use useRuntimeOptional safely.
 */
export function ConditionalRuntimeProvider({ children }: ConditionalRuntimeProviderProps) {
  const pathname = usePathname() ?? '/';

  if (isDemoRoute(pathname)) {
    return <RuntimeProvider>{children}</RuntimeProvider>;
  }

  return <RuntimeContext.Provider value={null}>{children}</RuntimeContext.Provider>;
}
