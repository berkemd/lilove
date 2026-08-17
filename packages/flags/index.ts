import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

/**
 * Initialize PostHog client for server-side analytics and feature flags
 * Safe to call multiple times - will only initialize once
 */
export function initPosthog(apiKey?: string, host?: string): PostHog | null {
  if (posthogClient) {
    return posthogClient;
  }

  const key = apiKey || process.env.POSTHOG_API_KEY;
  const phHost = host || process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!key) {
    console.log('[PostHog] API key not found - analytics and feature flags disabled');
    return null;
  }

  try {
    posthogClient = new PostHog(key, {
      host: phHost,
      flushAt: 20,
      flushInterval: 10000,
    });
    
    console.log('[PostHog] Initialized successfully');
    return posthogClient;
  } catch (error) {
    console.error('[PostHog] Failed to initialize:', error);
    return null;
  }
}

/**
 * Capture an analytics event
 * No-op if PostHog is not initialized
 */
export function capture(
  userId: string,
  event: string,
  properties?: Record<string, any>
): void {
  if (!posthogClient) {
    return; // Silent fail in dev mode
  }

  try {
    posthogClient.capture({
      distinctId: userId,
      event,
      properties: properties || {},
    });
  } catch (error) {
    console.error('[PostHog] Failed to capture event:', error);
  }
}

/**
 * Check if a feature flag is enabled for a user
 * Returns false if PostHog is not initialized or flag check fails
 */
export async function isFlagEnabled(
  userId: string,
  flagKey: string
): Promise<boolean> {
  if (!posthogClient) {
    return false; // Flags off by default in dev mode
  }

  try {
    const isEnabled = await posthogClient.isFeatureEnabled(flagKey, userId);
    return !!isEnabled;
  } catch (error) {
    console.error(`[PostHog] Failed to check flag '${flagKey}':`, error);
    return false;
  }
}

/**
 * Get the PostHog client instance
 * Returns null if not initialized
 */
export function getPostHogClient(): PostHog | null {
  return posthogClient;
}

/**
 * Flush all pending events (useful for graceful shutdown)
 */
export async function flushPosthog(): Promise<void> {
  if (!posthogClient) {
    return;
  }

  try {
    await posthogClient.flush();
  } catch (error) {
    console.error('[PostHog] Failed to flush:', error);
  }
}

/**
 * Feature flags used in the application
 */
export const FLAGS = {
  COACH_ENGINE_V1: 'coach_engine_v1',
  INSIGHTS_V1: 'insights_v1',
  TEAM_WORKSPACE_V1: 'team_workspace_v1',
  UNIFIED_ENTITLEMENTS: 'unified_entitlements',
} as const;
