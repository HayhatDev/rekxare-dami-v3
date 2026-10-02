import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLangStore } from '../stores/useLangStore';
import { RATE_LIMITED } from '../services/aiAdvisor';

interface UseAIFetchOptions<T> {
  queryKey: string;
  fetcher: (lang: string) => Promise<T>;
  enabled?: boolean;
}

export function useAIFetch<T>({ queryKey, fetcher, enabled = true }: UseAIFetchOptions<T>) {
  const { lang } = useLangStore();
  const queryClient = useQueryClient();

  const query = useQuery<T>({
    queryKey: [queryKey, lang],
    queryFn: async () => {
      try {
        return await fetcher(lang);
      } catch (e: any) {
        if (e?.message === 'AUTH_REQUIRED') {
          throw new Error('AUTH_REQUIRED');
        }
        throw e;
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.message === 'AUTH_REQUIRED') return false;
      // Retrying a rate-limited request immediately burns the same hourly
      // budget it just refused, so it can only turn one refusal into two.
      if (error?.message === RATE_LIMITED) return false;
      return failureCount < 1;
    },
    enabled,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [queryKey, lang] });
  };

  const needsAuth = query.error?.message === 'AUTH_REQUIRED';
  const isRateLimited = query.error?.message === RATE_LIMITED;

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError && !needsAuth,
    needsAuth,
    isRateLimited,
    refresh,
  };
}