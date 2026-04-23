'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const modalSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md sm:max-w-lg',
  lg: 'max-w-lg sm:max-w-2xl',
  xl: 'max-w-full sm:max-w-2xl lg:max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  initialFocusRef,
}: ModalProps) {
  const { t } = useI18n();
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Handle focus trap and initial focus
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Set initial focus
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      // Restore previous focus when modal closes
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, initialFocusRef]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-modal flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        aria-label={t('common.closeModal')}
        type="button"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={cn(
          'relative w-full overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[var(--kw-dark-surface)]',
          'animate-scale-in',
          modalSizes[size]
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-[var(--kw-border)] px-4 py-4 sm:px-6">
            <div>
              {title && (
                <h2 id="modal-title" className="text-xl font-semibold text-[var(--kw-text)]">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-[var(--kw-text-muted)]">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                type="button"
                aria-label={t('common.closeModal')}
                className="rounded-full p-2 transition-colors hover:bg-[var(--kw-surface-alt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]"
              >
                <X className="h-5 w-5 text-[var(--kw-text-muted)]" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="max-h-[calc(85dvh-4rem)] overflow-y-auto px-4 py-4 sm:px-6 safe-area-pb">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmModalProps extends Omit<ModalProps, 'children'> {
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  message?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'primary';
}

export function ConfirmModal({
  onConfirm,
  confirmText,
  cancelText,
  message,
  isLoading,
  variant = 'primary',
  ...props
}: ConfirmModalProps) {
  const { t } = useI18n();
  const finalConfirmText = confirmText ?? t('modal.confirm');
  const finalCancelText = cancelText ?? t('modal.cancel');
  return (
    <Modal {...props} size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-[var(--kw-text-muted)]">{message || t('modal.defaultConfirmMessage')}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={props.onClose}
            type="button"
            className="rounded-full px-4 py-2 text-[var(--kw-text-muted)] transition-colors hover:bg-[var(--kw-surface-alt)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] dark:text-[var(--kw-dark-text-muted)]"
          >
            {finalCancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            type="button"
            className={cn(
              'rounded-full px-6 py-2 font-medium text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              variant === 'danger'
                ? 'bg-[var(--kw-error)] hover:brightness-90 focus-visible:ring-[var(--kw-error)]'
                : 'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] hover:from-[var(--kw-primary-500)] hover:to-[var(--kw-primary-600)] focus-visible:ring-[var(--kw-primary-400)]'
            )}
          >
            {isLoading ? t('common.loadingEllipsis') : finalConfirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
