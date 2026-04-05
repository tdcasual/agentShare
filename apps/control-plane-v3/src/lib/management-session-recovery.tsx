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
        'border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-[#1E1E32] dark:text-red-300 dark:hover:bg-red-900/20"
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
        'border border-amber-100 bg-amber-50/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400',
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
        'border border-dashed border-pink-200 bg-pink-50/40 text-gray-600 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]/40 dark:text-[#9CA3AF]',
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
