'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
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
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Handle focus trap and initial focus
  React.useEffect(() => {
    if (!isOpen) return;
    
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

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
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
          'relative w-full bg-white rounded-3xl shadow-2xl overflow-hidden',
          'animate-scale-in',
          modalSizes[size]
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-pink-100">
            <div>
              {title && (
                <h2 id="modal-title" className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{title}</h2>
              )}
              {description && (
                <p id="modal-description" className="text-sm text-gray-500 dark:text-[#9CA3AF] mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                type="button"
                aria-label="Close modal"
                className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-[#9CA3AF]" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
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
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  message,
  isLoading,
  variant = 'primary',
  ...props
}: ConfirmModalProps) {
  return (
    <Modal {...props} size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-gray-600 dark:text-[#9CA3AF]">
          {message || 'Are you sure you want to proceed with this action?'}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={props.onClose}
            type="button"
            className="px-4 py-2 rounded-full text-gray-600 dark:text-[#9CA3AF] hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            type="button"
            className={cn(
              'px-6 py-2 rounded-full text-white font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              variant === 'danger' 
                ? 'bg-red-500 hover:bg-red-600 focus-visible:ring-red-400' 
                : 'bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] hover:from-[var(--kw-primary-500)] hover:to-[var(--kw-primary-600)] focus-visible:ring-[var(--kw-primary-400)]'
            )}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
