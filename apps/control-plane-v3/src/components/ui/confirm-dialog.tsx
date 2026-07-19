'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { Spinner } from '@/components/ui/spinner';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'primary';
}

/**
 * Controlled confirmation dialog.
 * The action stays open while isLoading so the caller can run async work and
 * close via state on success. A local pending state disables the confirm
 * button synchronously on first click so a same-frame double click cannot
 * fire onConfirm twice before the parent's async setState lands.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isLoading,
  variant = 'primary',
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const [isPending, setIsPending] = useState(false);

  // 对话框关闭、或异步操作结束（isLoading 回落）时复位，允许失败重试
  useEffect(() => {
    if (!isOpen || !isLoading) {
      setIsPending(false);
    }
  }, [isOpen, isLoading]);

  const busy = Boolean(isLoading) || isPending;

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          {title && <AlertDialogTitle>{title}</AlertDialogTitle>}
          <AlertDialogDescription>{message ?? ''}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelText ?? t('modal.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (isPending) {
                return;
              }
              setIsPending(true);
              onConfirm();
            }}
            disabled={busy}
            className={cn(
              variant === 'danger' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            )}
          >
            {busy ? (
              <>
                <Spinner size="sm" />
                <span className="sr-only">{confirmText ?? t('modal.confirm')}</span>
              </>
            ) : (
              (confirmText ?? t('modal.confirm'))
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
