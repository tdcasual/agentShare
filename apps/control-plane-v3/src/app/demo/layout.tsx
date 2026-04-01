/**
 * Demo Layout - 演示模式布局
 * 
 * 明确标识为演示/开发模式，与管理控制台分离
 * 显示演示模式指示器，避免用户混淆
 */

import Link from 'next/link';
import { ReactNode } from 'react';
import { FlaskConical, ArrowLeft, AlertTriangle, Compass, ArrowRight } from 'lucide-react';

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
            <span className="font-medium">Demo Sandbox</span>
            <span className="hidden sm:inline text-amber-100">
              • Non-production sandbox for demos, prototypes, and interaction experiments
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
          <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">Demonstration Environment</p>
            <p>
              This section is a non-production sandbox that uses local runtime data and demo fixtures.
              Changes made here do not affect production systems or real management state.
            </p>
            <p>
              Use this area for interaction experiments, prototype flows, and demo storytelling before the backend-backed console experience is finalized.
            </p>
            <p>
              Remove this sandbox once the production surfaces reach parity for the same journey and no longer need fixture-only behavior.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl border border-amber-200/80 bg-white/80 p-4 dark:border-amber-800/80 dark:bg-[#1E1E32]/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Compass className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-300" />
              <div className="space-y-1 text-sm text-amber-900 dark:text-amber-100">
                <p className="font-medium">Back to Sandbox Directory</p>
                <p>Use the sandbox directory as the source of truth for demo-only routes, then jump back into the matching live management surfaces when the prototype is ready to retire.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sandbox Directory
              </Link>
              <Link
                href="/identities"
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-[#252540] dark:text-stone-100 dark:hover:bg-[#2A2A45]"
              >
                View live identities
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/spaces"
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-[#252540] dark:text-stone-100 dark:hover:bg-[#2A2A45]"
              >
                View live spaces
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
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
