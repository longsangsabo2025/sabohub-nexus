import { useState, useCallback, useEffect } from 'react';

export interface UseLoadingProps {
  initialState?: boolean;
  delay?: number; // Minimum loading time in ms
}

export const useLoading = ({ initialState = false, delay = 500 }: UseLoadingProps = {}) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [startTime, setStartTime] = useState<number | null>(null);

  const startLoading = useCallback(() => {
    setStartTime(Date.now());
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    if (startTime && delay > 0) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, delay - elapsedTime);
      
      setTimeout(() => {
        setIsLoading(false);
        setStartTime(null);
      }, remainingTime);
    } else {
      setIsLoading(false);
      setStartTime(null);
    }
  }, [startTime, delay]);

  const toggle = useCallback(() => {
    if (isLoading) {
      stopLoading();
    } else {
      startLoading();
    }
  }, [isLoading, startLoading, stopLoading]);

  // Auto cleanup on unmount
  useEffect(() => {
    return () => {
      if (startTime) {
        setIsLoading(false);
        setStartTime(null);
      }
    };
  }, [startTime]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    toggle,
  };
};

// Hook for async operations
export const useAsyncLoading = () => {
  const { isLoading, startLoading, stopLoading } = useLoading();

  const executeAsync = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      onSuccess?: (result: T) => void,
      onError?: (error: Error) => void
    ): Promise<T | void> => {
      try {
        startLoading();
        const result = await asyncFn();
        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        onError?.(errorObj);
        console.error('Async operation failed:', errorObj);
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return {
    isLoading,
    executeAsync,
  };
};

// Hook for page transitions
export const usePageLoading = () => {
  const [isPageLoading, setIsPageLoading] = useState(false);

  const startPageLoading = useCallback(() => {
    setIsPageLoading(true);
  }, []);

  const stopPageLoading = useCallback(() => {
    // Add a small delay to prevent flash
    setTimeout(() => setIsPageLoading(false), 100);
  }, []);

  return {
    isPageLoading,
    startPageLoading,
    stopPageLoading,
  };
};