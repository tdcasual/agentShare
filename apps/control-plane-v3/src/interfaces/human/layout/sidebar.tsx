'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LayoutDashboard,
  Users,
  Package,
  Globe,
  Zap,
  CheckSquare,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Hub', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/identities', label: 'Identities', icon: <Users className="w-5 h-5" /> },
  { href: '/assets', label: 'Assets', icon: <Package className="w-5 h-5" /> },
  { href: '/spaces', label: 'Spaces', icon: <Globe className="w-5 h-5" /> },
  { href: '/tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" />, badge: 3 },
  { href: '/marketplace', label: 'Marketplace', icon: <Sparkles className="w-5 h-5" /> },
];

const bottomNavItems: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-pink-100 transition-all duration-300 z-40',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-pink-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white text-xl shadow-glow flex-shrink-0">
          🌸
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="font-bold text-gray-800 whitespace-nowrap">Control Plane</h1>
            <p className="text-xs text-gray-500">V3 Dual Cosmos</p>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-pink-200 flex items-center justify-center text-gray-400 hover:text-pink-500 hover:border-pink-300 transition-colors shadow-sm"
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
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-700'
                  : 'text-gray-600 hover:bg-pink-50/50 hover:text-pink-600',
                collapsed && 'justify-center'
              )}
            >
              <span className={cn(
                'transition-transform duration-200',
                isActive && 'scale-110'
              )}>
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="font-medium flex-1">{item.label}</span>
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
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-pink-100 space-y-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700'
                  : 'text-gray-500 hover:bg-gray-50/50',
                collapsed && 'justify-center'
              )}
            >
              {item.icon}
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
