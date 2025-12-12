'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ErrorState {
  error: Error | null;
  isError: boolean;
  errorMessage: string | null;
  errorCode: string | null;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  toastTitle?: string;
  logError?: boolean;
  retryable?: boolean;
}

export function useErrorHandler() {
  const { toast } = useToast();
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorMessage: null,
    errorCode: null,
  });

  const handleError = useCallback((
    error: any,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      toastTitle = 'Error',
      logError = true,
      retryable = false,
    } = options;

    // Extract error information
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorMessage = getErrorMessage(errorObj);
    const errorCode = getErrorCode(errorObj);

    // Update error state
    setErrorState({
      error: errorObj,
      isError: true,
      errorMessage,
      errorCode,
    });

    // Log error if requested
    if (logError) {
      console.error('Error handled:', errorObj);
    }

    // Show toast notification if requested
    if (showToast) {
      toast({
        title: toastTitle,
        description: errorMessage,
        variant: 'destructive',
        duration: retryable ? 8000 : 5000,
      });
    }
  }, [toast]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorMessage: null,
      errorCode: null,
    });
  }, []);

  const retryOperation = useCallback(async (
    operation: () => Promise<void>,
    options: ErrorHandlerOptions = {}
  ) => {
    try {
      clearError();
      await operation();
    } catch (error) {
      handleError(error, { ...options, retryable: true });
    }
  }, [handleError, clearError]);

  return {
    ...errorState,
    handleError,
    clearError,
    retryOperation,
  };
}

/**
 * Extract user-friendly error message
 */
function getErrorMessage(error: Error): string {
  // Firebase/Firestore specific errors
  if ('code' in error) {
    const code = (error as any).code;
    switch (code) {
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      case 'unavailable':
        return 'Service is temporarily unavailable. Please try again.';
      case 'deadline-exceeded':
        return 'Request timed out. Please check your connection and try again.';
      case 'not-found':
        return 'The requested data was not found.';
      case 'already-exists':
        return 'This record already exists.';
      case 'resource-exhausted':
        return 'Service is temporarily overloaded. Please try again later.';
      case 'failed-precondition':
        return 'Operation cannot be completed due to system constraints.';
      case 'aborted':
        return 'Operation was aborted due to a conflict. Please try again.';
      case 'out-of-range':
        return 'Invalid input parameters provided.';
      case 'unimplemented':
        return 'This feature is not yet available.';
      case 'internal':
        return 'An internal error occurred. Please try again.';
      case 'data-loss':
        return 'Data corruption detected. Please contact support.';
      case 'unauthenticated':
        return 'Authentication required. Please log in again.';
      default:
        break;
    }
  }

  // Network errors
  if (error.message.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }

  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  // Generic error message
  return error.message || 'An unexpected error occurred.';
}

/**
 * Extract error code
 */
function getErrorCode(error: Error): string | null {
  if ('code' in error) {
    return (error as any).code;
  }
  return null;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if ('code' in error) {
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'internal',
      'unknown',
      'resource-exhausted',
      'aborted',
    ];
    return retryableCodes.includes(error.code);
  }

  // Network errors are generally retryable
  if (error.message?.includes('fetch') || error.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Check if error is a permission/auth error
 */
export function isAuthError(error: any): boolean {
  if ('code' in error) {
    const authCodes = ['permission-denied', 'unauthenticated'];
    return authCodes.includes(error.code);
  }
  return false;
}