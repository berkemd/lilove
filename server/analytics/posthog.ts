// PostHog Analytics Client
import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function initPostHog() {
  if (!posthogClient && process.env.POSTHOG_API_KEY) {
    posthogClient = new PostHog(
      process.env.POSTHOG_API_KEY,
      {
        host: process.env.POSTHOG_HOST || 'https://app.posthog.com'
      }
    );
    console.log('✅ PostHog analytics initialized');
  }
}

export function getPostHogClient(): PostHog | null {
  if (!posthogClient && process.env.POSTHOG_API_KEY) {
    initPostHog();
  }
  
  return posthogClient;
}

export async function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, any>
) {
  const client = getPostHogClient();
  if (client) {
    client.capture({
      distinctId: userId,
      event,
      properties
    });
  }
}

export async function identifyUser(
  userId: string,
  properties?: Record<string, any>
) {
  const client = getPostHogClient();
  if (client) {
    client.identify({
      distinctId: userId,
      properties
    });
  }
}
