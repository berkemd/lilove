import type { Request, Response, NextFunction } from 'express';
import { getPostHogClient } from '../analytics/posthog';

/**
 * Feature Flag Middleware
 * 
 * Checks PostHog feature flags before allowing access to endpoints.
 * Returns 403 Forbidden if feature is disabled.
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    claims: {
      sub: string;
      email?: string;
    };
  };
}

/**
 * Middleware factory to check if a feature flag is enabled
 * @param flagName - The PostHog feature flag key to check
 * @returns Express middleware function
 */
export function requireFeatureFlag(flagName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ 
          message: 'Unauthorized',
          error: 'Authentication required'
        });
      }

      const posthog = getPostHogClient();
      
      // If PostHog is not configured, allow access (fail open for development)
      if (!posthog) {
        console.warn(`PostHog not configured, allowing access to ${flagName}`);
        return next();
      }

      // Check feature flag with PostHog
      const isEnabled = await posthog.isFeatureEnabled(flagName, userId);
      
      if (!isEnabled) {
        return res.status(403).json({
          message: 'Feature not available',
          error: `The ${flagName.replace(/_/g, ' ')} feature is not enabled for your account`,
          featureFlag: flagName,
          available: false
        });
      }

      // Feature is enabled, proceed
      next();
    } catch (error) {
      console.error(`Error checking feature flag ${flagName}:`, error);
      
      // Fail open - allow access if feature flag check fails
      console.warn(`Feature flag check failed for ${flagName}, allowing access`);
      next();
    }
  };
}

/**
 * Check if feature flag is enabled without blocking the request
 * Useful for conditional logic in route handlers
 */
export async function checkFeatureFlag(
  userId: string, 
  flagName: string
): Promise<boolean> {
  try {
    const posthog = getPostHogClient();
    
    if (!posthog) {
      return true; // Default to enabled if PostHog not configured
    }

    return await posthog.isFeatureEnabled(flagName, userId);
  } catch (error) {
    console.error(`Error checking feature flag ${flagName}:`, error);
    return true; // Default to enabled on error
  }
}
