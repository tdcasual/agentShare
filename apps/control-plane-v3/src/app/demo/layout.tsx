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
    <div className="min-h-screen bg-gradient-to-br from-[var(--kw-sky-surface)]/50 to-[var(--kw-purple-surface)]/30 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-bg)]">
      {/* 演示模式顶部横幅 */}
      <div className="bg-[var(--kw-warning)] px-4 py-2 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            <span className="font-medium">Demo Sandbox</span>
            <span className="hidden text-amber-100 sm:inline">
              • Non-production sandbox for demos, prototypes, and interaction experiments
            </span>
          </div>
          <Link href="/" className="flex items-center gap-1 text-sm hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Console
          </Link>
        </div>
      </div>

      {/* 警告提示 */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-[var(--kw-dark-amber-surface)] dark:bg-[var(--kw-dark-amber-surface)]/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]" />
          <div className="space-y-2 text-sm text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
            <p className="font-medium">Demonstration Environment</p>
            <p>
              This section is a non-production sandbox that uses local runtime data and demo
              fixtures. Changes made here do not affect production systems or real management state.
            </p>
            <p>
              Use this area for interaction experiments, prototype flows, and demo storytelling
              before the backend-backed console experience is finalized.
            </p>
            <p>
              Remove this sandbox once the production surfaces reach parity for the same journey and
              no longer need fixture-only behavior.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-2xl border border-[var(--kw-amber-surface)]/80 bg-white/80 p-4 dark:border-[var(--kw-dark-amber-surface)]/80 dark:bg-[var(--kw-dark-surface-alt)]/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <Compass className="mt-0.5 h-5 w-5 text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]" />
              <div className="space-y-1 text-sm text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
                <p className="font-medium">Back to Sandbox Directory</p>
                <p>
                  Use the sandbox directory as the source of truth for demo-only routes, then jump
                  back into the matching live management surfaces when the prototype is ready to
                  retire.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-950/40 dark:text-[var(--kw-warning)] dark:hover:bg-amber-900/50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sandbox Directory
              </Link>
              <Link
                href="/identities"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-surface-alt)]"
              >
                View live identities
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/spaces"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-surface-alt)]"
              >
                View live spaces
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
