import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let isInitialized = false;
let isOptedOut = false;

export function initAnalytics() {
  if (typeof window !== 'undefined' && !isInitialized && POSTHOG_KEY) {
    // Check if user has opted out
    const optOut = localStorage.getItem('analytics_opt_out') === 'true';
    isOptedOut = optOut;
    
    // Respect Do Not Track browser setting
    const dnt = navigator.doNotTrack === '1' || (window as any).doNotTrack === '1';
    
    if (optOut || dnt) {
      console.log('Analytics disabled: User opt-out or Do Not Track enabled');
      return;
    }

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      opt_out_capturing_by_default: false,
      loaded: (posthog) => {
        if (import.meta.env.DEV) {
          console.log('PostHog initialized');
        }
      },
      ip: false,
    });
    
    isInitialized = true;
  }
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (isOptedOut || !isInitialized) return;
  posthog.identify(userId, traits);
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (isOptedOut || !isInitialized) return;
  posthog.capture(eventName, properties);
}

export function resetAnalytics() {
  if (!isInitialized) return;
  posthog.reset();
}

export function setAnalyticsOptOut(optOut: boolean) {
  isOptedOut = optOut;
  localStorage.setItem('analytics_opt_out', String(optOut));
  
  if (optOut) {
    posthog.opt_out_capturing();
  } else {
    posthog.opt_in_capturing();
    if (!isInitialized) {
      initAnalytics();
    }
  }
}

export function getAnalyticsOptOutStatus(): boolean {
  return localStorage.getItem('analytics_opt_out') === 'true';
}

export function checkFeatureFlag(flagKey: string, defaultValue: boolean = false): boolean {
  if (!isInitialized || isOptedOut) return defaultValue;
  return posthog.isFeatureEnabled(flagKey) ?? defaultValue;
}

export async function getFeatureFlag(flagKey: string, defaultValue: any = false): Promise<any> {
  if (!isInitialized || isOptedOut) return defaultValue;
  return await posthog.getFeatureFlag(flagKey) ?? defaultValue;
}

export function onFeatureFlags(callback: (flags: string[]) => void): void {
  if (!isInitialized || isOptedOut) return;
  posthog.onFeatureFlags(callback);
}

// Export posthog instance for advanced usage
export { posthog };
