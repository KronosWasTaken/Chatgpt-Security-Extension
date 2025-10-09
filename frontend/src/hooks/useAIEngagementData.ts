import { useState, useEffect } from 'react';
import { 
  AIEngagementData, 
  getAIEngagementData, 
  isDataInitialized, 
  subscribeToDataUpdates,
  initializeAIEngagementData 
} from '@/data/aiEngagement';

/**
 * Custom hook to get AI engagement data with automatic re-rendering
 * when data becomes available
 */
export const useAIEngagementData = (days?: number) => {
  const [data, setData] = useState<AIEngagementData>(() => getAIEngagementData());
  const [isLoading, setIsLoading] = useState(!isDataInitialized());

  useEffect(() => {
    // If data is not initialized, trigger initialization with days parameter
    if (!isDataInitialized()) {
      initializeAIEngagementData(days).catch(console.error);
    }

    // Subscribe to data updates
    const unsubscribe = subscribeToDataUpdates(() => {
      setData(getAIEngagementData());
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [days]); // Re-run effect if days parameter changes

  return { data, isLoading };
};
