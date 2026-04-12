'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, icon, type = 'text', id: idProp, ...props }, ref) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helper && !error ? `${id}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--kw-text-muted)]">
              {icon}
            </div>
          )}
          <input
            id={id}
            type={type}
            className={cn(
              'w-full rounded-2xl border-2 bg-white px-4 py-3 text-base outline-none transition-colors transition-shadow duration-[var(--kw-duration-fast)] dark:bg-[var(--kw-dark-surface)]',
              'placeholder:text-[var(--kw-text-muted)]',
              'focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)]',
              error &&
                'border-[var(--kw-error)] focus:border-[var(--kw-error)] focus:ring-[var(--kw-rose-surface)]',
              icon && 'pl-12',
              className
            )}
            ref={ref}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-[var(--kw-error)]">
            {error}
          </p>
        )}
        {helper && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-[var(--kw-text-muted)]">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }
>(({ className, label, error, id: idProp, ...props }, ref) => {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = errorId || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--kw-text)]">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          'w-full resize-none rounded-2xl border-2 border-[var(--kw-primary-200)] bg-white px-4 py-3 text-base outline-none transition-colors transition-shadow duration-[var(--kw-duration-fast)] dark:bg-[var(--kw-dark-surface)]',
          'placeholder:text-[var(--kw-text-muted)]',
          'focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)]',
          error &&
            'border-[var(--kw-error)] focus:border-[var(--kw-error)] focus:ring-[var(--kw-rose-surface)]',
          className
        )}
        ref={ref}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-[var(--kw-error)]">
          {error}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export { Input, Textarea };
