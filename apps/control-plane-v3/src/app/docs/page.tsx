import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Code, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Documentation - VaultGate',
  description: 'VaultGate API documentation and quick start guide.',
};

export default function DocsPage() {
  return (
    <main id="main-content" className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">文档</h1>
          <p className="mt-1 text-sm text-muted-foreground">VaultGate API 文档与快速入门指南</p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            返回仪表板
          </Button>
        </Link>
      </div>

      {/* API Reference */}
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">API 参考</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          VaultGate 提供 OpenAPI/Swagger 文档，可在本地运行后端服务后访问：
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs">GET /docs</code>
            <span>— Swagger UI</span>
          </li>
          <li className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs">GET /openapi.json</code>
            <span>— OpenAPI schema</span>
          </li>
        </ul>
      </Card>

      {/* Quick Start */}
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">快速入门</h2>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-inside list-decimal space-y-2">
            <li>
              访问 <strong>仪表板</strong> 创建密钥（Secrets）。
            </li>
            <li>
              在 <strong>Token</strong> 页面创建访问 Token，并为其授权可访问的密钥范围。
            </li>
            <li>
              使用 Token 通过 Bearer 认证调用 Runtime API：
              <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
                curl -H &quot;Authorization: Bearer YOUR_TOKEN&quot; http://localhost:8000/api/vault
              </pre>
            </li>
          </ol>
        </div>
      </Card>
    </main>
  );
}
