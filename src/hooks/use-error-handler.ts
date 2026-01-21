/**
 * React Query Error Handler Hook
 * 
 * Provides easy-to-use error handling for React Query mutations and queries
 * 
 * Usage:
 * ```typescript
 * const { handleError } = useErrorHandler();
 * 
 * const mutation = useMutation({
 *   mutationFn: async () => { ... },
 *   onError: (error) => {
 *     handleError(error, {
 *       category: ErrorCategory.DATABASE,
 *       context: 'Failed to create task',
 *     });
 *   },
 * });
 * ```
 */

import { useToast } from '@/hooks/use-toast';
import { handleError, ErrorCategory, type ErrorContext } from '@/lib/error-handling';

// Re-export ErrorCategory for convenience
export { ErrorCategory };

export function useErrorHandler() {
  const { toast } = useToast();

  const handleErrorWithToast = (
    error: unknown,
    context: ErrorContext & { showToast?: boolean } = {}
  ) => {
    const { message, category } = handleError(error, context);

    // Show toast by default, unless explicitly disabled
    if (context.showToast !== false) {
      toast({
        title: 'Lỗi',
        description: message,
        variant: 'destructive',
      });
    }

    return { message, category };
  };

  return {
    handleError: handleErrorWithToast,
    ErrorCategory,
  };
}

