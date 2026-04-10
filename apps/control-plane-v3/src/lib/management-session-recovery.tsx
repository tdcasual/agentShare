'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api-client';
import { useManagementSessionGate } from '@/lib/session';
import { cn } from '@/lib/utils';
import { Card } from '@/shared/ui-primitives/card';

type QueryErrorInput = unknown | unknown[];

export function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

export function isForbiddenError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403;
}

export function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function useManagementPageSessionRecovery(queryErrors: QueryErrorInput) {
  const gate = useManagementSessionGate({
    redirectOnMissingSession: false,
  });
  const [sessionExpired, setSessionExpired] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const normalizedErrors = normalizeErrors(queryErrors);
  const querySessionExpired = normalizedErrors.some(isUnauthorizedError);
  const queryForbidden = normalizedErrors.some(isForbiddenError);
  const shouldShowSessionExpired = sessionExpired || querySessionExpired;
  const shouldShowForbidden = forbidden || queryForbidden;

  return {
    ...gate,
    querySessionExpired,
    queryForbidden,
    shouldShowSessionExpired,
    shouldShowForbidden,
    sessionExpired,
    forbidden,
    clearSessionExpired: () => setSessionExpired(false),
    clearForbidden: () => setForbidden(false),
    clearAllAuthErrors: () => {
      setSessionExpired(false);
      setForbidden(false);
    },
    markSessionExpired: () => setSessionExpired(true),
    markForbidden: () => setForbidden(true),
    consumeUnauthorized: (error: unknown) => {
      if (isUnauthorizedError(error)) {
        setSessionExpired(true);
        return true;
      }
      if (isForbiddenError(error)) {
        setForbidden(true);
        return true;
      }
      return false;
    },
  };
}

export function ManagementSessionExpiredAlert({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <Card
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 text-[var(--kw-rose-text)] dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 dark:text-[var(--kw-error)]',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--kw-error)] bg-white px-4 py-2 text-sm font-semibold text-[var(--kw-rose-text)] transition-colors hover:bg-[var(--kw-rose-surface)] dark:border-[var(--kw-dark-error-surface)] dark:bg-[var(--kw-dark-surface-alt)] dark:text-[var(--kw-error)] dark:hover:bg-[var(--kw-dark-error-surface)]/20"
        >
          Return to Login
        </Link>
      </div>
    </Card>
  );
}

export function ManagementForbiddenAlert({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <Card
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'border border-[var(--kw-amber-surface)] bg-[var(--kw-amber-surface)]/80 text-[var(--kw-amber-text)] dark:dark:border-[var(--kw-dark-amber-surface)]/50 dark:bg-[var(--kw-dark-amber-surface)]/20 dark:text-[var(--kw-warning)]',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
      </div>
    </Card>
  );
}

export function ManagementSessionRecoveryNotice({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        'border border-dashed border-[var(--kw-primary-200)] bg-[var(--kw-primary-50)]/40 text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)]/40 dark:text-[var(--kw-dark-text-muted)]',
        className
      )}
    >
      {message}
    </Card>
  );
}

function normalizeErrors(errors: QueryErrorInput) {
  return Array.isArray(errors) ? errors : [errors];
}
