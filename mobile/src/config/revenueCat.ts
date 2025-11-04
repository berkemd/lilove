// RevenueCat Configuration for LiLove
export const REVENUECAT_CONFIG = {
  // RevenueCat Public API Key
  // This will be replaced with the actual key from environment
  publicApiKey: process.env.EXPO_PUBLIC_REVENUECAT_KEY || 'rc_public_key_placeholder',
  
  // Product IDs - must match App Store Connect
  products: {
    premiumMonthly: 'lilove_premium_monthly',
    premiumYearly: 'lilove_premium_yearly',
    teamMonthly: 'lilove_team_monthly',
    teamYearly: 'lilove_team_yearly',
  },
  
  // Entitlement IDs
  entitlements: {
    premium: 'premium',
    team: 'team',
  },
  
  // Offerings
  offerings: {
    default: 'default',
    premium: 'premium',
    team: 'team',
  },
};

// Product details for display
export const PRODUCT_DETAILS = {
  lilove_premium_monthly: {
    id: 'lilove_premium_monthly',
    title: 'Premium Monthly',
    description: 'Unlock all premium features with monthly subscription',
    price: '$9.99',
    priceLocalized: {
      'en-US': '$9.99',
      'tr-TR': '₺349.99',
    },
    period: 'month',
    features: [
      'Unlimited AI coaching conversations',
      'Advanced analytics and insights',
      'Priority support',
      'Custom challenges',
      'Ad-free experience',
    ],
  },
  lilove_premium_yearly: {
    id: 'lilove_premium_yearly',
    title: 'Premium Yearly',
    description: 'Save 17% with annual subscription',
    price: '$99.99',
    priceLocalized: {
      'en-US': '$99.99',
      'tr-TR': '₺3499.99',
    },
    period: 'year',
    savings: '17%',
    features: [
      'Everything in Premium Monthly',
      'Save $20 per year',
      'Annual progress report',
      'Exclusive yearly challenges',
    ],
  },
  lilove_team_monthly: {
    id: 'lilove_team_monthly',
    title: 'Team Monthly',
    description: 'Premium features for your entire team',
    price: '$19.99',
    priceLocalized: {
      'en-US': '$19.99',
      'tr-TR': '₺699.99',
    },
    period: 'month',
    features: [
      'Everything in Premium',
      'Up to 5 team members',
      'Team analytics dashboard',
      'Shared goals and challenges',
      'Team collaboration tools',
    ],
  },
  lilove_team_yearly: {
    id: 'lilove_team_yearly',
    title: 'Team Yearly',
    description: 'Best value for teams - save 17%',
    price: '$199.99',
    priceLocalized: {
      'en-US': '$199.99',
      'tr-TR': '₺6999.99',
    },
    period: 'year',
    savings: '17%',
    features: [
      'Everything in Team Monthly',
      'Save $40 per year',
      'Annual team report',
      'Priority team support',
      'Custom team challenges',
    ],
  },
};

// Helper to get localized price
export function getLocalizedPrice(productId: string, locale: string = 'en-US'): string {
  const product = PRODUCT_DETAILS[productId as keyof typeof PRODUCT_DETAILS];
  if (!product) return '';
  
  const localizedPrice = product.priceLocalized[locale as keyof typeof product.priceLocalized];
  return localizedPrice || product.price;
}

// Helper to check if user has premium access
export function hasPremiumAccess(entitlements: string[]): boolean {
  return entitlements.includes(REVENUECAT_CONFIG.entitlements.premium) ||
         entitlements.includes(REVENUECAT_CONFIG.entitlements.team);
}

// Helper to check if user has team access
export function hasTeamAccess(entitlements: string[]): boolean {
  return entitlements.includes(REVENUECAT_CONFIG.entitlements.team);
}