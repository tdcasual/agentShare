/**
 * Demo Layout - 演示模式布局
 * 
 * 明确标识为演示/开发模式，与管理控制台分离
 * 显示演示模式指示器，避免用户混淆
 */

import Link from 'next/link';
import { ReactNode } from 'react';
import { FlaskConical, ArrowLeft, AlertTriangle } from 'lucide-react';

interface DemoLayoutProps {
  children: ReactNode;
}

export default function DemoLayout({ children }: DemoLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-[#1A1A2E] dark:to-[#1E1E3A]">
      {/* 演示模式顶部横幅 */}
      <div className="bg-amber-500 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            <span className="font-medium">Demo Mode</span>
            <span className="hidden sm:inline text-amber-100">
              • This is a demonstration environment with local/runtime data
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Console
          </Link>
        </div>
      </div>
      
      {/* 警告提示 */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Demonstration Environment</p>
            <p>
              This section uses local runtime data and demo fixtures. 
              Changes made here do not affect production systems or real management state.
            </p>
          </div>
        </div>
      </div>
      
      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
