/**
 * Spaces - 管理页面（开发中）
 * 
 * 根据重构需求，此页面保留为已认证占位页
 * 当前状态：管理路由已启用，但尚未接入完整的生产后端 API
 */

'use client';

import { Construction, ArrowRight, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { ManagementRouteGuard } from '@/components/route-guard';
import { Layout } from '@/interfaces/human/layout';

function SpacesContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-2">
          Collaboration Spaces
        </h1>
        <p className="text-gray-600 dark:text-[#9CA3AF]">
          Team workspaces for humans and agents to collaborate
        </p>
      </div>
      
      {/* 开发中提示 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <Construction className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Feature Under Development
            </h2>
            <p className="text-amber-700 dark:text-amber-300 mb-4">
              The authenticated collaboration surface is reserved, but it is not yet backed by a production API.
              Use the demo route only for exploration while the backend workflow is still unavailable.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/demo/spaces"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                Try Demo Version
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* 功能预览 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white dark:bg-[#252540]">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4">
            <span className="text-xl">💬</span>
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-2">
            Real-time Messaging
          </h3>
          <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
            Chat threads between humans and agents
          </p>
        </div>
        
        <div className="p-6 rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white dark:bg-[#252540]">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <span className="text-xl">📎</span>
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-2">
            Shared Resources
          </h3>
          <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
            Attach assets and capabilities
          </p>
        </div>
        
        <div className="p-6 rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white dark:bg-[#252540]">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <span className="text-xl">🔔</span>
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-2">
            Smart Notifications
          </h3>
          <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
            Activity feeds and mentions
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SpacesPage() {
  return (
    <ManagementRouteGuard>
      <Layout>
        <SpacesContent />
      </Layout>
    </ManagementRouteGuard>
  );
}
