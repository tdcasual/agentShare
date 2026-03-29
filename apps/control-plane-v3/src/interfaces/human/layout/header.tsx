'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Search,
  Bell,
  Plus,
  MessageSquare,
  Command,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import { Input } from '../../../shared/ui-primitives/input';
import { Avatar, AvatarGroup } from '../../../shared/ui-primitives/avatar';
import { Button } from '../../../shared/ui-primitives/button';
import type { Identity } from '../../../shared/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HeaderProps {
  currentIdentity: Identity | null;
  onlineIdentities: Identity[];
  onCreateClick: () => void;
}

export function Header({ currentIdentity, onlineIdentities, onCreateClick }: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const notifications = [
    { id: 1, type: 'agent', message: 'DeployBot completed task "API Deployment"', time: '2m ago' },
    { id: 2, type: 'human', message: 'Alice mentioned you in #project-alpha', time: '5m ago' },
    { id: 3, type: 'system', message: 'New Agent DataAnalyzer joined the workspace', time: '1h ago' },
  ];

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-pink-100 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left - Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search identities, assets, spaces..."
            className="w-full pl-11 pr-4 py-2 rounded-full bg-gray-100/80 border-none text-sm focus:ring-2 focus:ring-pink-200 focus:bg-white transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs text-gray-400 border border-gray-200">
            <Command className="w-3 h-3" />
            <span>K</span>
          </kbd>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Online Users */}
        {onlineIdentities.length > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-700">{onlineIdentities.length} online</span>
            <AvatarGroup className="ml-1">
              {onlineIdentities.slice(0, 3).map((identity) => (
                <Avatar
                  key={identity.id}
                  src={identity.profile.avatar}
                  size="xs"
                  type={identity.type}
                />
              ))}
            </AvatarGroup>
          </div>
        )}

        {/* Create Button */}
        <Button variant="primary" size="sm" onClick={onCreateClick}>
          <Plus className="w-4 h-4 mr-1" />
          Create
        </Button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-full text-gray-500 hover:bg-pink-50 hover:text-pink-600 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] flex items-center justify-center">
              {notifications.length}
            </span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-pink-100 overflow-hidden z-50 animate-slide-up">
                <div className="p-4 border-b border-pink-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  <button className="text-sm text-pink-600 hover:text-pink-700">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-pink-50/50 transition-colors border-b border-pink-50 last:border-0 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          notification.type === 'agent' && 'bg-green-100 text-green-600',
                          notification.type === 'human' && 'bg-sky-100 text-sky-600',
                          notification.type === 'system' && 'bg-purple-100 text-purple-600'
                        )}>
                          {notification.type === 'agent' && '🤖'}
                          {notification.type === 'human' && '👤'}
                          {notification.type === 'system' && '⚡'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <button className="p-2.5 rounded-full text-gray-500 hover:bg-pink-50 hover:text-pink-600 transition-colors">
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* User Menu */}
        {currentIdentity && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Avatar
                src={currentIdentity.profile.avatar}
                type={currentIdentity.type}
                size="sm"
                status={currentIdentity.presence}
              />
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {currentIdentity.profile.name}
              </span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-pink-100 overflow-hidden z-50 animate-slide-up">
                  <div className="p-4 border-b border-pink-100">
                    <p className="font-semibold text-gray-800">{currentIdentity.profile.name}</p>
                    <p className="text-sm text-gray-500">
                      {currentIdentity.type === 'human' ? 'Human User' : 'AI Agent'}
                    </p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-700 hover:bg-pink-50 transition-colors">
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-700 hover:bg-pink-50 transition-colors">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <hr className="my-2 border-pink-100" />
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
