import { useState, useCallback, useRef } from 'react';
import { ApiError } from '@/services/http';
import type { PaginatedData } from '@xiaoqu-bangbang/shared';

interface UsePaginatedListResult<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function usePaginatedList<T>(
  fetcher: (page: number, pageSize: number) => Promise<PaginatedData<T>>,
  deps: unknown[] = [],
  pageSize = 10
): UsePaginatedListResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const pageRef = useRef(1);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    pageRef.current = 1;
    try {
      const result = await fetcher(1, pageSize);
      if (mountedRef.current) {
        setItems(result.items);
        setHasMore(result.items.length >= pageSize);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err : new ApiError(-1, '未知错误'));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const result = await fetcher(nextPage, pageSize);
      if (mountedRef.current) {
        setItems((prev) => [...prev, ...result.items]);
        pageRef.current = nextPage;
        setHasMore(result.items.length >= pageSize);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof ApiError ? err : new ApiError(-1, '未知错误'));
      }
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [fetcher, hasMore, loadingMore, pageSize]);

  return { items, loading, loadingMore, hasMore, error, refresh, loadMore };
}
