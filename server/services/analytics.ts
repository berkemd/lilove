import * as Sentry from '@sentry/node';

export class AnalyticsService {
  // Track user events
  trackEvent(userId: string, eventName: string, properties?: Record<string, any>) {
    Sentry.addBreadcrumb({
      category: 'analytics',
      message: eventName,
      level: 'info',
      data: { userId, ...properties },
    });

    // Can integrate with other analytics platforms here
    // e.g., Mixpanel, Amplitude, PostHog
  }

  // Track errors
  trackError(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, { contexts: context });
  }

  // Track performance using Sentry spans (startTransaction was deprecated)
  trackPerformance(operationName: string, duration: number) {
    Sentry.startSpan(
      {
        name: operationName,
        op: 'custom',
      },
      (span) => {
        // The span will automatically be finished when the callback returns
        // We use setTimeout to simulate the duration but the span tracking is async
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, duration);
        });
      }
    );
  }

  // Track user actions
  trackUserAction(userId: string, action: string, metadata?: any) {
    this.trackEvent(userId, `user.${action}`, metadata);
  }

  // Track payment events
  trackPaymentEvent(userId: string, event: string, amount?: number, currency?: string) {
    this.trackEvent(userId, `payment.${event}`, { amount, currency });
    
    // Also log to Sentry for important payment events
    if (['completed', 'failed', 'refunded'].includes(event)) {
      Sentry.captureMessage(`Payment ${event}: User ${userId}`, {
        level: 'info',
        contexts: {
          payment: { amount, currency, event }
        }
      });
    }
  }
}

export const analytics = new AnalyticsService();