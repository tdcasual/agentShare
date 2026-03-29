'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { getRuntime } from '../../../core/runtime';
import { IdentityDomainPlugin } from '../../../domains/identity/plugin';
import { IdentityRegistryServiceId } from '../../../domains/identity/services/identity-registry';
import type { Identity } from '../../../shared/types';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null);
  const [onlineIdentities, setOnlineIdentities] = useState<Identity[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const runtime = getRuntime();
      
      // Register and activate identity plugin
      const identityPlugin = new IdentityDomainPlugin();
      runtime.plugin.register(identityPlugin);
      await runtime.plugin.activatePlugin(identityPlugin.id);

      // Get registry
      const registry = runtime.di.resolve(IdentityRegistryServiceId);
      
      // Get all identities
      const allIdentities = registry.getAll();
      
      // Set current identity (first human for demo)
      const firstHuman = allIdentities.find(i => i.type === 'human');
      if (firstHuman) {
        setCurrentIdentity(firstHuman);
        registry.setPresence(firstHuman.id, 'online');
      }

      // Get online identities
      const online = allIdentities.filter(i => i.presence === 'online');
      setOnlineIdentities(online);

      // Listen for presence changes
      registry.onPresenceChanged((id, presence) => {
        const identity = registry.getById(id);
        if (identity) {
          setOnlineIdentities(prev => {
            if (presence === 'online') {
              return prev.find(i => i.id === id) ? prev : [...prev, identity];
            } else {
              return prev.filter(i => i.id !== id);
            }
          });
        }
      });

      setIsLoading(false);
    };

    init();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
          <p className="text-gray-500">Initializing Dual Cosmos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 to-purple-50/30">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <div 
        className="transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '80px' : '256px' }}
      >
        <Header
          currentIdentity={currentIdentity}
          onlineIdentities={onlineIdentities}
          onCreateClick={() => setShowCreateModal(true)}
        />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
