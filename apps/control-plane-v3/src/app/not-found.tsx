import Link from 'next/link';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-purple-surface)] p-4 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
      <Card variant="feature" className="w-full max-w-md space-y-6 p-8 text-center">
        <div className="text-6xl">🌸</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--kw-text)]">页面迷路了</h1>
          <p className="text-[var(--kw-text-muted)]">
            抱歉，我们找不到你要去的页面。它可能已经搬家了，或者从未存在过。
          </p>
        </div>
        <Button className="w-full">
          <Link href="/" className="flex w-full items-center justify-center">
            返回首页
          </Link>
        </Button>
      </Card>
    </div>
  );
}
