import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '@/services/http';

interface UseRequestResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useRequest<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options?: { enabled?: boolean }
): UseRequestResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const mountedRef = useRef(true);

  const enabled = options?.enabled ?? true;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err : new ApiError(-1, '未知错误'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      refresh();
    }
    return () => { mountedRef.current = false; };
  }, [refresh, enabled]);

  return { data, loading, error, refresh };
}
