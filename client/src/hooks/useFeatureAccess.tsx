import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useLocation } from 'wouter';

// Feature keys that can be gated
export const FEATURES = {
  UNLIMITED_GOALS: 'unlimited_goals',
  ADVANCED_AI_COACHING: 'advanced_ai_coaching',
  ANALYTICS_DASHBOARD: 'analytics_dashboard',
  PERFORMANCE_INSIGHTS: 'performance_insights',
  PRIORITY_SUPPORT: 'priority_support',
  TEAM_COLLABORATION: 'team_collaboration',
  CUSTOM_THEMES: 'custom_themes',
  API_ACCESS: 'api_access',
  WHITE_LABEL: 'white_label',
  DATA_EXPORT: 'data_export',
  AI_PROMPTS: 'ai_prompts',
  PRIORITY_PROCESSING: 'priority_processing',
  GOAL_TEMPLATES: 'goal_templates',
  AI_POWERUPS: 'ai_powerups',
  COACHING_SESSIONS: 'coaching_sessions',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

// Tier levels for comparison
export const TIER_LEVELS = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
} as const;

// Feature requirements by tier
export const FEATURE_REQUIREMENTS: Record<FeatureKey, keyof typeof TIER_LEVELS> = {
  [FEATURES.UNLIMITED_GOALS]: 'pro',
  [FEATURES.ADVANCED_AI_COACHING]: 'pro',
  [FEATURES.ANALYTICS_DASHBOARD]: 'pro',
  [FEATURES.PERFORMANCE_INSIGHTS]: 'pro',
  [FEATURES.PRIORITY_SUPPORT]: 'pro',
  [FEATURES.TEAM_COLLABORATION]: 'team',
  [FEATURES.CUSTOM_THEMES]: 'pro',
  [FEATURES.API_ACCESS]: 'enterprise',
  [FEATURES.WHITE_LABEL]: 'enterprise',
  [FEATURES.DATA_EXPORT]: 'pro',
  [FEATURES.AI_PROMPTS]: 'free', // Limited by count
  [FEATURES.PRIORITY_PROCESSING]: 'pro',
  [FEATURES.GOAL_TEMPLATES]: 'free', // Purchaseable
  [FEATURES.AI_POWERUPS]: 'free', // Purchaseable
  [FEATURES.COACHING_SESSIONS]: 'free', // Purchaseable
};

interface FeatureAccessResult {
  hasAccess: boolean;
  limitOk: boolean;
  canUseFeature: boolean;
  requiredTier?: keyof typeof TIER_LEVELS;
  currentTier?: keyof typeof TIER_LEVELS;
  upgradeMessage?: string;
}

export function useFeatureAccess(featureKey: FeatureKey) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Get current subscription
  const { data: subscription } = useQuery<any>({
    queryKey: ['/api/subscription'],
    enabled: !!user,
  });

  // Check feature access
  const { data: featureAccess, isLoading } = useQuery({
    queryKey: ['/api/check-feature-access', featureKey],
    queryFn: async () => {
      const response = await apiRequest('/api/check-feature-access', { 
        method: 'POST',
        body: JSON.stringify({ featureKey })
      });
      return await response.json();
    },
    enabled: !!user,
  });

  const currentTier = subscription?.tier || 'free';
  const requiredTier = FEATURE_REQUIREMENTS[featureKey];
  const hasAccess = featureAccess?.hasAccess ?? false;
  const limitOk = featureAccess?.limitOk ?? true;
  const canUseFeature = hasAccess && limitOk;

  const getUpgradeMessage = () => {
    if (hasAccess && !limitOk) {
      return 'You have reached your limit for this feature. Upgrade to get more!';
    }
    if (!hasAccess) {
      return `This feature requires ${requiredTier} plan or higher. Upgrade to unlock!`;
    }
    return undefined;
  };

  const showUpgradePrompt = (customMessage?: string) => {
    const message = customMessage || getUpgradeMessage();
    
    toast({
      title: 'Upgrade Required',
      description: message,
    });
    
    // Navigate to pricing after a small delay
    setTimeout(() => navigate('/pricing'), 100);
  };

  const requireFeature = (callback?: () => void) => {
    if (!canUseFeature) {
      showUpgradePrompt();
      return false;
    }
    if (callback) {
      callback();
    }
    return true;
  };

  return {
    hasAccess,
    limitOk,
    canUseFeature,
    requiredTier,
    currentTier,
    isLoading,
    showUpgradePrompt,
    requireFeature,
    upgradeMessage: getUpgradeMessage(),
  };
}

// Hook to check if user has any premium subscription
export function useIsPremium() {
  const { user } = useAuth();
  const { data: subscription } = useQuery<any>({
    queryKey: ['/api/subscription'],
    enabled: !!user,
  });

  const tier = subscription?.tier || 'free';
  const isPremium = tier !== 'free';
  const isTeam = tier === 'team' || tier === 'enterprise';
  const isEnterprise = tier === 'enterprise';

  return {
    isPremium,
    isTeam,
    isEnterprise,
    tier,
  };
}

// Hook to manage coin spending
export function useCoins() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Get coin balance
  const { data: coinBalance, isLoading } = useQuery<any>({
    queryKey: ['/api/coin-balance'],
    enabled: !!user,
  });

  const balance = coinBalance?.balance || 0;

  const canAfford = (amount: number) => {
    return balance >= amount;
  };

  const spendCoins = async (amount: number, purpose: string, sourceId?: string) => {
    if (!canAfford(amount)) {
      toast({
        title: 'Insufficient Coins',
        description: `You need ${amount} coins but only have ${balance}. Purchase more coins to continue!`,
      });
      setTimeout(() => navigate('/pricing?tab=coins'), 100);
      return false;
    }

    try {
      const response = await apiRequest('/api/spend-coins', { 
        method: 'POST',
        body: JSON.stringify({ amount, purpose, sourceId })
      });
      await response.json();

      toast({
        title: 'Coins Spent',
        description: `You spent ${amount} coins on ${purpose}`,
      });

      return true;
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to spend coins. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const showInsufficientCoinsPrompt = (required: number) => {
    const needed = required - balance;
    toast({
      title: 'Not Enough Coins',
      description: `You need ${needed} more coins for this action. Click here to buy coins.`,
    });
    setTimeout(() => navigate('/pricing?tab=coins'), 100);
  };

  return {
    balance,
    isLoading,
    canAfford,
    spendCoins,
    showInsufficientCoinsPrompt,
  };
}

// Component to wrap premium features
interface FeatureGateProps {
  feature: FeatureKey;
  children: any;
  fallback?: any;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback = null,
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { canUseFeature, isLoading, showUpgradePrompt: promptFn } = useFeatureAccess(feature);

  if (isLoading) {
    return null;
  }

  if (!canUseFeature) {
    if (showUpgradePrompt) {
      promptFn();
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}