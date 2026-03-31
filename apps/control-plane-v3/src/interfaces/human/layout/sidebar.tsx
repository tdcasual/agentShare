'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import {
  LayoutDashboard,
  Users,
  Package,
  Globe,
  CheckSquare,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  badge?: number;
}

function useNavItems(): NavItem[] {
  const { t } = useI18n();
  return [
    { href: '/', labelKey: t('navigation.hub'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: '/identities', labelKey: t('navigation.identities'), icon: <Users className="w-5 h-5" /> },
    { href: '/assets', labelKey: t('navigation.assets'), icon: <Package className="w-5 h-5" /> },
    { href: '/spaces', labelKey: t('navigation.spaces'), icon: <Globe className="w-5 h-5" /> },
    { href: '/tokens', labelKey: t('navigation.tokens'), icon: <KeyRound className="w-5 h-5" /> },
    { href: '/tasks', labelKey: t('navigation.tasks'), icon: <CheckSquare className="w-5 h-5" />, badge: 3 },
    { href: '/reviews', labelKey: t('navigation.reviews'), icon: <ShieldCheck className="w-5 h-5" /> },
    { href: '/marketplace', labelKey: t('navigation.marketplace'), icon: <Sparkles className="w-5 h-5" /> },
  ];
}

function useBottomNavItems(): NavItem[] {
  const { t } = useI18n();
  return [
    { href: '/settings', labelKey: t('navigation.settings'), icon: <Settings className="w-5 h-5" /> },
  ];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const navItems = useNavItems();
  const bottomNavItems = useBottomNavItems();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white dark:bg-[#252540] border-r border-pink-100 dark:border-[#3D3D5C] transition-all duration-300 z-40',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-pink-100 dark:border-[#3D3D5C]">
        <div 
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-xl shadow-glow flex-shrink-0"
          aria-label="Sakura logo"
          role="img"
        >
          <span aria-hidden="true">🌸</span>
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="font-bold text-gray-800 dark:text-[#E8E8EC] whitespace-nowrap">Control Plane</h1>
            <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">V3 Dual Cosmos</p>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('sidebar.expand') || 'Expand sidebar' : t('sidebar.collapse') || 'Collapse sidebar'}
        type="button"
        className="absolute -right-3 top-20 w-11 h-11 rounded-full bg-white dark:bg-[#252540] border border-pink-200 dark:border-[#3D3D5C] flex items-center justify-center text-gray-400 dark:text-[#9CA3AF] hover:text-pink-500 dark:hover:text-[#E891C0] hover:border-pink-300 dark:hover:border-[#E891C0] transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]',
                isActive
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 dark:from-[#3D3D5C] dark:to-[#4D4D6C] text-pink-700 dark:text-[#E891C0]'
                  : 'text-gray-600 dark:text-[#9CA3AF] hover:bg-pink-50/50 dark:hover:bg-[#3D3D5C]/50 hover:text-pink-600 dark:hover:text-[#E891C0]',
                collapsed && 'justify-center'
              )}
            >
              <span className={cn(
                'transition-transform duration-200',
                isActive && 'scale-110'
              )} aria-hidden="true">
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="font-medium flex-1">{item.labelKey}</span>
                  {item.badge && (
                    <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-pink-100 dark:border-[#3D3D5C] space-y-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]',
                isActive
                  ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#3D3D5C] dark:to-[#4D4D6C] text-gray-700 dark:text-[#E8E8EC]'
                  : 'text-gray-500 dark:text-[#9CA3AF] hover:bg-gray-50/50 dark:hover:bg-[#3D3D5C]/50',
                collapsed && 'justify-center'
              )}
            >
              <span aria-hidden="true">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.labelKey}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
