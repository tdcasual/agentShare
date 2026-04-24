'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useOpenClawFiles, refreshOpenClawAgents } from '@/domains/identity';
import type { OpenClawAgent } from '@/domains/identity';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { useI18n } from '@/components/i18n-provider';

export interface WorkspaceFilesManagerProps {
  agent: OpenClawAgent;
}

export function WorkspaceFilesManager({ agent }: WorkspaceFilesManagerProps) {
  const { t } = useI18n();
  const filesQuery = useOpenClawFiles(agent.id);
  const files = filesQuery.data?.items ?? [];
  const [expandedFiles, setExpandedFiles] = useState<string[]>([]);

  function toggleFile(fileName: string) {
    setExpandedFiles((current) =>
      current.includes(fileName) ? current.filter((f) => f !== fileName) : [...current, fileName]
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
          {t('identities.sections.workspaceFilesTitle')}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{files.length}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshOpenClawAgents()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {filesQuery.isLoading ? (
        <p className="text-sm text-[var(--kw-text-muted)]">{t('identities.loadingWorkspaceFiles')}</p>
      ) : filesQuery.error instanceof Error ? (
        <p className="text-sm text-[var(--kw-error)]">
          {t('identities.workspaceFilesUnavailable')} {filesQuery.error.message}
        </p>
      ) : files.length === 0 ? (
        <p className="text-sm text-[var(--kw-text-muted)]">{t('identities.noWorkspaceFiles')}</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const isExpanded = expandedFiles.includes(file.file_name);
            return (
              <div
                key={file.file_name}
                className="rounded-2xl border border-[var(--kw-border)] bg-white/80 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80"
              >
                <button
                  type="button"
                  onClick={() => toggleFile(file.file_name)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 flex-shrink-0 text-[var(--kw-text-muted)]" />
                    <span className="truncate text-sm font-medium text-[var(--kw-text)]">{file.file_name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-[var(--kw-text-muted)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-[var(--kw-text-muted)]" />
                  )}
                </button>
                {isExpanded ? (
                  <div className="border-t border-[var(--kw-border)] px-3 py-3 dark:border-[var(--kw-dark-border)]">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[var(--kw-surface-alt)] p-3 text-xs text-[var(--kw-text-muted)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text-muted)]">
                      {file.content || t('identities.labels.emptyFile')}
                    </pre>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
