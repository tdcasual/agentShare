'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { revealSecret } from '@/domains/secret';
import type { Secret } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const REVEAL_SECONDS = 30;

export function SecretRevealDialog({
  secret,
  open,
  onOpenChange,
}: {
  secret: Secret | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(REVEAL_SECONDS);

  // 父组件常传入内联闭包，用 ref 跟踪最新的 onOpenChange，
  // 避免倒计时 effect 因回调引用变化而反复重建 interval。
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
    if (!open || !secret) {
      setValue(null);
      setError(null);
      setCopied(false);
      setCopyError(null);
      setRemaining(REVEAL_SECONDS);
      return;
    }
    let stale = false;
    setLoading(true);
    setError(null);
    void revealSecret(secret.id)
      .then((revealed) => {
        if (!stale) {
          setValue(revealed);
          setRemaining(REVEAL_SECONDS);
        }
      })
      .catch((caught) => {
        if (!stale) {
          setError(caught instanceof Error ? caught.message : t('secrets.revealFailed'));
        }
      })
      .finally(() => {
        if (!stale) {
          setLoading(false);
        }
      });
    return () => {
      stale = true;
    };
  }, [open, secret, t]);

  useEffect(() => {
    if (!open || value === null) {
      return;
    }
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setValue(null);
          onOpenChangeRef.current(false);
          return REVEAL_SECONDS;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('secrets.revealTitle', { name: secret?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('secrets.revealDescription')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-md bg-destructive/10 p-4">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw />}
              onClick={() => onOpenChange(false)}
            >
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <>
            <pre
              tabIndex={0}
              aria-label={t('secrets.revealedValue')}
              className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md border bg-muted/50 p-4 text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {value}
            </pre>
            <p role="status" className="text-xs text-muted-foreground">
              {t('secrets.autoHide', { seconds: remaining })}
            </p>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} leftIcon={<EyeOff />}>
            {t('secrets.hideNow')}
          </Button>
          <Button
            variant="secondary"
            disabled={value === null}
            leftIcon={copied ? <Check /> : <Copy />}
            onClick={async () => {
              if (value === null) {
                return;
              }
              try {
                await navigator.clipboard.writeText(value);
                setCopied(true);
                setCopyError(null);
                toast.success(t('common.copySuccess'));
              } catch {
                setCopyError(t('secrets.copyFailed'));
              }
            }}
          >
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
        </DialogFooter>
        {copyError && (
          <p role="alert" className="text-sm text-destructive">
            {copyError}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
