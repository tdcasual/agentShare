'use client';

import { useCallback, useState } from 'react';
import { ApiError } from '@/lib/vaultgate-api';

export interface MutationMessages {
  fallbackError: string;
  success?: string;
}

function errorMessageFor(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function useMutationFeedback() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFeedback = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const runMutation = useCallback(
    async <T>(mutation: () => Promise<T>, messages: MutationMessages): Promise<T> => {
      setIsSubmitting(true);
      clearFeedback();
      try {
        const result = await mutation();
        if (messages.success) {
          setSuccess(messages.success);
        }
        return result;
      } catch (mutationError) {
        setError(errorMessageFor(mutationError, messages.fallbackError));
        throw mutationError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearFeedback]
  );

  return {
    error,
    success,
    isSubmitting,
    setError,
    setSuccess,
    clearFeedback,
    runMutation,
  };
}
