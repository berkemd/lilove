import { PostHog } from 'posthog-node';
import { db } from '../storage';
import { userConsents } from '@shared/schema';
import { eq } from 'drizzle-orm';

let posthogClient: PostHog | null = null;

export function initPostHog(): PostHog | null {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('PostHog API key not found. Server-side analytics disabled.');
    }
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(apiKey, {
      host,
      flushAt: 20,
      flushInterval: 10000,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('PostHog server client initialized');
    }
  }

  return posthogClient;
}

export function getPostHogClient(): PostHog | null {
  if (!posthogClient) {
    return initPostHog();
  }
  return posthogClient;
}

/**
 * Check if user has consented to analytics tracking
 * @param userId - User ID to check consent for
 * @returns boolean indicating if analytics consent is granted
 */
export async function checkAnalyticsConsent(userId: string): Promise<boolean> {
  try {
    const consent = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .limit(1);

    // Default to false (no consent) - opt-in required
    if (!consent || consent.length === 0) {
      return false;
    }

    return consent[0].analytics === true;
  } catch (error) {
    return false; // Fail closed - no consent means no tracking
  }
}

/**
 * Check if user has consented to behavioral data collection
 * @param userId - User ID to check consent for
 * @returns boolean indicating if behavioral consent is granted
 */
export async function checkBehavioralConsent(userId: string): Promise<boolean> {
  try {
    const consent = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .limit(1);

    // Default to false (no consent) - opt-in required
    if (!consent || consent.length === 0) {
      return false;
    }

    return consent[0].behavioral === true;
  } catch (error) {
    return false; // Fail closed - no consent means no tracking
  }
}

export async function trackServerEvent(
  eventName: string,
  userId: string,
  properties?: Record<string, any>
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  // Check analytics consent before tracking
  const hasConsent = await checkAnalyticsConsent(userId);
  if (!hasConsent) {
    return;
  }

  try {
    client.capture({
      distinctId: userId,
      event: eventName,
      properties: {
        ...properties,
        $geoip_disable: true,
        consent_timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
  }
}

export async function identifyServerUser(
  userId: string,
  properties: Record<string, any>
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  // Always allow user identification (needed for feature flags)
  // But include consent status in properties
  try {
    const consent = await db
      .select()
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .limit(1);

    const consentData = consent && consent.length > 0 ? consent[0] : null;

    client.identify({
      distinctId: userId,
      properties: {
        ...properties,
        consent_analytics: consentData?.analytics || false,
        consent_behavioral: consentData?.behavioral || false,
        consent_marketing: consentData?.marketing || false,
        consent_version: consentData?.consentVersion || null,
      },
    });
  } catch (error) {
  }
}

export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    await posthogClient.shutdown();
    posthogClient = null;
  }
}

process.on('SIGTERM', async () => {
  await shutdownPostHog();
});

process.on('SIGINT', async () => {
  await shutdownPostHog();
});
