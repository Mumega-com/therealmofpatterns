import { useState, useCallback } from 'react';

interface UseErrorReturn {
  error: Error | null;
  isError: boolean;
  setError: (error: Error | string | null) => void;
  clearError: () => void;
  handleError: (error: unknown) => void;
}

/**
 * Hook for handling errors in components
 */
export function useError(): UseErrorReturn {
  const [error, setErrorState] = useState<Error | null>(null);

  const setError = useCallback((err: Error | string | null) => {
    if (err === null) {
      setErrorState(null);
    } else if (typeof err === 'string') {
      setErrorState(new Error(err));
    } else {
      setErrorState(err);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleError = useCallback((err: unknown) => {
    console.error('Error caught:', err);

    if (err instanceof Error) {
      setErrorState(err);
    } else if (typeof err === 'string') {
      setErrorState(new Error(err));
    } else {
      setErrorState(new Error('An unexpected error occurred'));
    }
  }, []);

  return {
    error,
    isError: error !== null,
    setError,
    clearError,
    handleError,
  };
}

/**
 * Utility to safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Utility to handle async operations with error catching
 */
export async function tryCatch<T>(
  promise: Promise<T>,
  errorHandler?: (error: Error) => void
): Promise<[T | null, Error | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    errorHandler?.(error);
    return [null, error];
  }
}

/**
 * Utility to get user-friendly error messages
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Handle common error types
    if (error.message.includes('fetch')) {
      return 'Unable to connect. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'You need to sign in to access this feature.';
    }
    if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('500')) {
      return 'Something went wrong on our end. Please try again later.';
    }
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}
