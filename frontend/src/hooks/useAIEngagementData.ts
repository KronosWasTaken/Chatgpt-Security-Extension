import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

/**
 * Custom hook to get AI engagement data from backend API
 */
export const useAIEngagementData = (days?: number) => {
  return useQuery({
    queryKey: ['ai-engagement', 'msp', 'clients', days],
    queryFn: () => apiClient.GetAIEngagement(days),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });
};
