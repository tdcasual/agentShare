/**
 * Marketplace - 显式不可用页面
 * 
 * 根据重构需求，此路由必须显式声明为不可用
 * 不伪装为活跃产品区域
 */

import { Construction, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MarketplacePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/50 to-purple-50/30 dark:from-[#1A1A2E] dark:to-[#252540] p-4">
      <div className="max-w-lg w-full bg-white dark:bg-[#252540] rounded-3xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] p-8 text-center">
        {/* 图标 */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
          <Construction className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>
        
        {/* 标题 */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-3">
          Marketplace Coming Soon
        </h1>
        
        {/* 说明 */}
        <p className="text-gray-600 dark:text-[#9CA3AF] mb-6">
          The marketplace feature is currently under development. 
          Check back later for updates on agents, capabilities, and integrations.
        </p>
        
        {/* 状态标识 */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Not Yet Available
        </div>
        
        {/* 返回链接 */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white font-medium hover:shadow-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
