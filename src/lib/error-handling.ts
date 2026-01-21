/**
 * STANDARDIZED ERROR HANDLING PATTERN
 * 
 * Use this pattern across ALL projects for consistent error handling.
 * 
 * Usage:
 * ```typescript
 * import { handleError, ErrorCategory } from '@/lib/error-handling';
 * 
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, {
 *     category: ErrorCategory.NETWORK,
 *     context: 'Failed to fetch user data',
 *     retry: () => someOperation(),
 *   });
 * }
 */

import * as Sentry from '@sentry/react';

export enum ErrorCategory {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  DATABASE = 'database',
  API = 'api',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  category?: ErrorCategory;
  context?: string;
  userId?: string;
  operation?: string;
  retry?: () => Promise<void> | void;
  showToast?: boolean;
  toastMessage?: string;
}

/**
 * Classify error into category
 */
export function classifyError(error: unknown): ErrorCategory {
  if (!error) return ErrorCategory.UNKNOWN;
  
  const errorString = error.toString().toLowerCase();
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
  
  // Network errors
  if (
    errorString.includes('network') ||
    errorString.includes('fetch') ||
    errorString.includes('timeout') ||
    errorString.includes('connection') ||
    errorMessage.includes('network') ||
    errorMessage.includes('failed to fetch')
  ) {
    return ErrorCategory.NETWORK;
  }
  
  // Auth errors
  if (
    errorString.includes('auth') ||
    errorString.includes('unauthorized') ||
    errorString.includes('forbidden') ||
    errorString.includes('token') ||
    errorString.includes('session') ||
    errorMessage.includes('auth') ||
    errorMessage.includes('chưa đăng nhập')
  ) {
    return ErrorCategory.AUTH;
  }
  
  // Validation errors
  if (
    errorString.includes('validation') ||
    errorString.includes('invalid') ||
    errorString.includes('required') ||
    errorString.includes('vui lòng') ||
    errorMessage.includes('validation')
  ) {
    return ErrorCategory.VALIDATION;
  }
  
  // Database errors (Supabase/PostgreSQL)
  if (
    errorString.includes('database') ||
    errorString.includes('postgres') ||
    errorString.includes('supabase') ||
    errorString.includes('postgrest') ||
    errorString.includes('sql') ||
    errorMessage.includes('database') ||
    errorMessage.includes('relation') ||
    errorMessage.includes('column')
  ) {
    return ErrorCategory.DATABASE;
  }
  
  // API errors
  if (
    errorString.includes('api') ||
    errorString.includes('endpoint') ||
    errorMessage.includes('api')
  ) {
    return ErrorCategory.API;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error message (Vietnamese)
 */
export function getUserFriendlyMessage(error: unknown, category: ErrorCategory): string {
  if (error instanceof Error && error.message) {
    // Return original message if it's already user-friendly (Vietnamese)
    if (
      error.message.includes('Vui lòng') ||
      error.message.includes('Lỗi') ||
      error.message.includes('Đã xảy ra') ||
      error.message.includes('Chưa') ||
      (!error.message.includes('Error:') && !error.message.includes('at ') && !error.message.includes('http'))
    ) {
      return error.message;
    }
  }
  
  const messages: Record<ErrorCategory, string> = {
    [ErrorCategory.NETWORK]: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.',
    [ErrorCategory.AUTH]: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    [ErrorCategory.VALIDATION]: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.',
    [ErrorCategory.DATABASE]: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    [ErrorCategory.API]: 'Lỗi kết nối server. Vui lòng thử lại sau.',
    [ErrorCategory.UNKNOWN]: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.',
  };
  
  return messages[category];
}

/**
 * Standardized error handler
 * 
 * This function:
 * 1. Classifies the error
 * 2. Logs to Sentry (if initialized)
 * 3. Returns user-friendly message
 */
export function handleError(
  error: unknown,
  context: ErrorContext = {}
): {
  category: ErrorCategory;
  message: string;
  originalError: unknown;
} {
  const category = context.category || classifyError(error);
  const message = context.toastMessage || getUserFriendlyMessage(error, category);
  
  // Report to Sentry
  if (typeof window !== 'undefined') {
    try {
      Sentry.captureException(error, {
        tags: {
          category,
          operation: context.operation || 'unknown',
        },
        contexts: {
          error: {
            context: context.context,
            userId: context.userId,
          },
        },
      });
    } catch (sentryError) {
      // Don't fail if Sentry is not initialized
      console.warn('Failed to report to Sentry:', sentryError);
    }
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[Error Handler]', {
      category,
      context: context.context,
      error,
      operation: context.operation,
    });
  }
  
  return {
    category,
    message,
    originalError: error,
  };
}

/**
 * Retry handler with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * React Query error handler wrapper
 * Use this in onError callbacks
 */
export function handleReactQueryError(
  error: unknown,
  context: ErrorContext = {}
): string {
  const { message } = handleError(error, context);
  return message;
}

