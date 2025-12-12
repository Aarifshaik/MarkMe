/**
 * Retry utility functions for handling network failures and transient errors
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryError extends Error {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(`Failed after ${attempts} attempts: ${lastError.message}`);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition,
    onRetry,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if this is the last attempt or if retry condition fails
      if (attempt === maxAttempts || !retryCondition(lastError)) {
        throw new RetryError(attempt, lastError);
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      console.warn(`Attempt ${attempt} failed, retrying in ${Math.round(jitteredDelay)}ms:`, lastError.message);
      
      await sleep(jitteredDelay);
    }
  }

  throw new RetryError(maxAttempts, lastError!);
}

/**
 * Default retry condition - retry on network errors and server errors
 */
function defaultRetryCondition(error: any): boolean {
  // Retry on network errors
  if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
    return true;
  }

  // Retry on Firebase errors that are likely transient
  if (error.code === 'internal' || error.code === 'unknown') {
    return true;
  }

  // Retry on HTTP 5xx errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Don't retry on authentication errors, permission errors, etc.
  if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
    return false;
  }

  // Don't retry on client errors (4xx)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }

  // Default to retrying for unknown errors
  return true;
}

/**
 * Sleep utility function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for Firestore operations
 */
export function withFirestoreRetry<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  return async (...args: T): Promise<R> => {
    return retryWithBackoff(
      () => fn(...args),
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000,
        retryCondition: (error) => {
          // Firestore-specific retry conditions
          const firestoreRetryableCodes = [
            'unavailable',
            'deadline-exceeded',
            'internal',
            'unknown',
            'resource-exhausted'
          ];
          return firestoreRetryableCodes.includes(error.code);
        },
        ...options,
      }
    );
  };
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * Create a circuit breaker for Firestore operations
 */
export const firestoreCircuitBreaker = new CircuitBreaker(5, 60000);