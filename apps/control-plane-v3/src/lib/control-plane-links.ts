/**
 * Navigation links for VaultGate.
 */

import type { ComponentType } from 'react';
import { LayoutDashboard, Key, Shield, ScrollText } from 'lucide-react';

export interface ShellNavItem {
  labelKey: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  requiredRole?: string;
}

export const SHELL_NAV_ITEMS: ShellNavItem[] = [
  { labelKey: 'navigation.dashboard', href: '/', icon: LayoutDashboard },
  { labelKey: 'navigation.secrets', href: '/secrets', icon: Key },
  { labelKey: 'navigation.tokens', href: '/tokens', icon: Shield },
  { labelKey: 'navigation.audit', href: '/audit', icon: ScrollText },
];

interface NavOptions {
  includeSettings?: boolean;
}

export function getVisibleShellNavItems(
  _role?: string | null,
  _options?: NavOptions,
): ShellNavItem[] {
  return SHELL_NAV_ITEMS;
}
