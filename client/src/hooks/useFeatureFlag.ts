import { useState, useEffect } from 'react';
import { checkFeatureFlag, onFeatureFlags } from '@/lib/analytics';

export function useFeatureFlag(flagKey: string, defaultValue: boolean = false) {
  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const currentValue = checkFeatureFlag(flagKey, defaultValue);
    setIsEnabled(currentValue);
    setIsLoading(false);

    try {
      onFeatureFlags(() => {
        const updatedValue = checkFeatureFlag(flagKey, defaultValue);
        setIsEnabled(updatedValue);
      });
    } catch (error) {
      // PostHog not initialized or opted out
      console.debug('Feature flags not available:', error);
      setIsLoading(false);
    }
  }, [flagKey, defaultValue]);

  return { isEnabled, isLoading };
}
