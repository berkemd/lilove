import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Check, Sparkles, Crown, Users, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Paddle.js TypeScript declarations
declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Initialize: (options: { token: string; eventCallback?: (data: any) => void }) => void;
      Checkout: {
        open: (options: {
          items?: Array<{ priceId: string; quantity: number }>;
          customer?: { email?: string };
          customData?: Record<string, any>;
          settings?: {
            successUrl?: string;
          };
        }) => void;
      };
    };
  }
}

async function getFirebaseToken(): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Failed to get Firebase token:', error);
    return null;
  }
}

const tiers = [
  {
    id: 'free',
    name: 'Free',
    icon: Sparkles,
    description: 'Perfect for getting started with your goals',
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlighted: false,
    features: [
      { text: '5 active goals', included: true },
      { text: 'Unlimited tasks', included: true },
      { text: '50 AI prompts/month', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Community support', included: true },
      { text: 'Unlimited goals', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Data export', included: false },
      { text: 'Custom themes', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Crown,
    description: 'Unlock your full potential with premium features',
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    highlighted: true,
    features: [
      { text: 'Everything in Free', included: true, bold: true },
      { text: 'Unlimited goals', included: true },
      { text: '1000 AI prompts/month', included: true },
      { text: 'Advanced analytics & insights', included: true },
      { text: 'Data export (JSON/CSV)', included: true },
      { text: 'Custom themes', included: true },
      { text: 'Priority AI coaching', included: true },
      { text: 'Priority support', included: true },
      { text: 'Team collaboration', included: false },
      { text: 'Team analytics', included: false },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    icon: Users,
    description: 'Collaborate and achieve more together',
    monthlyPrice: 99.99,
    yearlyPrice: 999,
    highlighted: false,
    features: [
      { text: 'Everything in Pro', included: true, bold: true },
      { text: '5 team members included', included: true },
      { text: '5000 AI prompts/month (shared)', included: true },
      { text: 'Shared coaching sessions', included: true },
      { text: 'Team analytics dashboard', included: true },
      { text: 'Collaborative goals', included: true },
      { text: 'Team challenges', included: true },
      { text: 'Member permissions', included: true },
      { text: 'Activity feed', included: true },
      { text: 'Admin controls', included: true },
      { text: 'Team onboarding', included: true },
    ],
  },
];

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paddleLoaded, setPaddleLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Fetch gamification profile to get coin balance
  type GamificationProfile = {
    level: number;
    coinBalance: number;
    currentXP: number;
    totalXP: number;
  };
  
  const { data: gamificationProfile } = useQuery<GamificationProfile>({
    queryKey: ['/api/gamification/profile'],
    enabled: !!user,
  });
  
  const coinBalance = gamificationProfile?.coinBalance || 0;

  // Load Paddle.js script and initialize
  useEffect(() => {
    const loadPaddle = () => {
      // Check if Paddle is already loaded
      if (window.Paddle) {
        setPaddleLoaded(true);
        return;
      }

      // Create script element for Paddle.js
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.async = true;
      
      script.onload = async () => {
        try {
          // Get Firebase token for authorization
          const firebaseToken = await getFirebaseToken();
          const headers: Record<string, string> = {};
          if (firebaseToken) {
            headers['Authorization'] = `Bearer ${firebaseToken}`;
          }
          // Fetch Paddle client token from backend
          const response = await fetch('/api/paddle/config', { headers });
          const config = await response.json();
          
          if (config.clientToken && window.Paddle) {
            // Set environment (sandbox or production)
            if (config.environment === 'sandbox') {
              window.Paddle.Environment.set('sandbox');
            }
            
            // Initialize Paddle with client token
            window.Paddle.Initialize({
              token: config.clientToken,
              eventCallback: (data) => {
                // Handle Paddle events (optional)
                console.log('Paddle event:', data);
                
                if (data.name === 'checkout.completed') {
                  toast({
                    title: 'Subscription activated!',
                    description: 'Your subscription is now active. Enjoy premium features!',
                  });
                  // Reload user data or navigate to dashboard
                  window.location.href = '/dashboard';
                }
              },
            });
            
            setPaddleLoaded(true);
            console.log('✅ Paddle.js initialized successfully');
          }
        } catch (error) {
          console.error('Failed to initialize Paddle:', error);
          toast({
            title: 'Setup Error',
            description: 'Could not initialize payment system. Please try again later.',
            variant: 'destructive',
          });
        }
      };
      
      script.onerror = () => {
        console.error('Failed to load Paddle.js script');
        toast({
          title: 'Loading Error',
          description: 'Could not load payment system. Please refresh the page.',
          variant: 'destructive',
        });
      };

      document.head.appendChild(script);
    };

    loadPaddle();
  }, [toast]);

  const calculateYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
    if (monthlyPrice === 0) return 0;
    const monthlyCost = monthlyPrice * 12;
    return monthlyCost - yearlyPrice;
  };

  const handleGetStarted = async (tierId: string) => {
    if (!isAuthenticated) {
      navigate('/auth?redirect=/pricing');
      return;
    }

    if (tierId === 'free') {
      navigate('/dashboard');
      return;
    }

    if (tierId === 'team') {
      // For Team plan, contact sales
      window.location.href = 'mailto:team@lilove.app?subject=Team Plan Inquiry';
      return;
    }

    // Handle Pro plan checkout with Paddle
    if (tierId === 'pro') {
      await handlePaddleCheckout(tierId as 'pro' | 'team');
    }
  };

  const handlePaddleCheckout = async (tier: 'pro' | 'team') => {
    if (!user || !paddleLoaded) {
      toast({
        title: 'Please wait',
        description: 'Payment system is loading...',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Get checkout URL from backend
      const response = await apiRequest(`/api/paddle/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          tier,
          billingCycle,
        }),
      });

      const data = await response.json();
      
      if (data.checkoutUrl) {
        // Redirect to Paddle checkout
        window.location.href = data.checkoutUrl;
      }
    } catch (error: any) {
      console.error('Paddle checkout error:', error);
      toast({
        title: 'Checkout Error',
        description: error.message || 'Could not initiate checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isCurrentPlan = (tierId: string) => {
    if (!user) return false;
    const userTier = user.subscriptionTier || 'free';
    return userTier === tierId;
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="text-center mb-12 sm:mb-16 space-y-4">
        <div className="inline-block">
          <Badge variant="secondary" className="mb-4 text-xs sm:text-sm px-3 py-1">
            Simple, Transparent Pricing
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Choose Your Growth Path
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Start free and upgrade as you grow. All plans include AI-powered coaching to help you achieve your goals.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-12" data-testid="billing-toggle">
        <Label 
          htmlFor="billing-toggle" 
          className={`text-sm sm:text-base transition-colors cursor-pointer ${
            billingCycle === 'monthly' ? 'text-foreground font-semibold' : 'text-muted-foreground'
          }`}
        >
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          data-testid="switch-billing-cycle"
        />
        <Label 
          htmlFor="billing-toggle" 
          className={`text-sm sm:text-base transition-colors cursor-pointer ${
            billingCycle === 'yearly' ? 'text-foreground font-semibold' : 'text-muted-foreground'
          }`}
        >
          Yearly
        </Label>
        {billingCycle === 'yearly' && (
          <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0" data-testid="badge-yearly-savings">
            Save up to $40/year
          </Badge>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const price = billingCycle === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
          const savings = billingCycle === 'yearly' ? calculateYearlySavings(tier.monthlyPrice, tier.yearlyPrice) : 0;
          const isCurrent = isCurrentPlan(tier.id);

          return (
            <Card
              key={tier.id}
              className={`relative transition-all ${
                tier.highlighted
                  ? 'border-primary ring-2 ring-primary shadow-lg scale-105 md:scale-110'
                  : 'border-border'
              }`}
              data-testid={`card-tier-${tier.id}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-lg" data-testid="badge-most-popular">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-6">
                <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  tier.highlighted 
                    ? 'bg-gradient-to-br from-pink-500 to-purple-500' 
                    : 'bg-muted'
                }`}>
                  <Icon className={`w-6 h-6 ${tier.highlighted ? 'text-white' : 'text-foreground'}`} />
                </div>
                <CardTitle className="text-2xl" data-testid={`text-tier-name-${tier.id}`}>{tier.name}</CardTitle>
                <CardDescription className="text-sm mt-2" data-testid={`text-tier-description-${tier.id}`}>
                  {tier.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold" data-testid={`text-price-${tier.id}`}>
                      ${price}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  {savings > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2" data-testid={`text-savings-${tier.id}`}>
                      Save ${savings.toFixed(2)} per year
                    </p>
                  )}
                  {isCurrent && (
                    <Badge variant="secondary" className="mt-2" data-testid={`badge-current-plan-${tier.id}`}>
                      Current Plan
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li
                      key={index}
                      className={`flex items-start gap-3 ${
                        feature.included ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                      data-testid={`feature-${tier.id}-${index}`}
                    >
                      <Check
                        className={`w-5 h-5 shrink-0 mt-0.5 ${
                          feature.included
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-muted-foreground opacity-30'
                        }`}
                      />
                      <span className={`text-sm ${feature.bold ? 'font-semibold' : ''}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-6">
                <Button
                  className="w-full"
                  variant={tier.highlighted ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => handleGetStarted(tier.id)}
                  disabled={isCurrent || (tier.id === 'pro' && isProcessing)}
                  data-testid={`button-get-started-${tier.id}`}
                >
                  {isCurrent ? (
                    'Current Plan'
                  ) : isProcessing && tier.id === 'pro' ? (
                    'Processing...'
                  ) : (
                    <>
                      {tier.id === 'free' ? 'Get Started' : tier.id === 'team' ? 'Contact Sales' : 'Upgrade Now'}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Coin Packages Section */}
      <Separator className="my-16" />
      
      <div className="mb-16">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-block">
            <Badge variant="secondary" className="mb-4 text-xs sm:text-sm px-3 py-1">
              Flexibility Add-Ons
            </Badge>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Coin Packages
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Need extra AI prompts? Purchase coin packages for flexible, one-time access without a subscription.
          </p>
          {isAuthenticated && coinBalance > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge variant="outline" className="text-base px-4 py-2">
                Your Balance: <span className="font-bold ml-2">{coinBalance} coins</span>
              </Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              id: 'starter', 
              name: 'Starter Pack', 
              coins: 250, 
              price: 49.99, 
              perPrompt: 0.20,
              popular: false 
            },
            { 
              id: 'value', 
              name: 'Value Pack', 
              coins: 600, 
              price: 99.99, 
              perPrompt: 0.17,
              popular: true 
            },
            { 
              id: 'power', 
              name: 'Power Pack', 
              coins: 1500, 
              price: 199.99, 
              perPrompt: 0.13,
              popular: false 
            },
            { 
              id: 'ultimate', 
              name: 'Ultimate Pack', 
              coins: 4000, 
              price: 399.99, 
              perPrompt: 0.10,
              popular: false 
            },
          ].map((pkg) => {
            const savingsAmount = pkg.price < 199.99 ? 0 : ((49.99 / 250 * pkg.coins) - pkg.price);
            const savings = savingsAmount > 0 ? Math.round(savingsAmount) : 0;
            
            return (
              <Card
                key={pkg.id}
                className={`relative transition-all ${
                  pkg.popular
                    ? 'border-yellow-500 ring-2 ring-yellow-500 shadow-lg'
                    : 'border-border'
                }`}
                data-testid={`card-coin-package-${pkg.id}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold mb-2">{pkg.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                      {pkg.coins}
                    </div>
                    <div className="text-sm text-muted-foreground">coins</div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">${pkg.price}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ${pkg.perPrompt.toFixed(2)} per prompt
                    </div>
                  </div>

                  {savings > 0 && (
                    <Badge variant="outline" className="w-full justify-center py-1">
                      Save ${savings}
                    </Badge>
                  )}

                  <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                    One-time purchase • Never expires
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={pkg.popular ? 'default' : 'outline'}
                    onClick={async () => {
                      if (!isAuthenticated) {
                        navigate('/auth?redirect=/pricing');
                        return;
                      }

                      setIsProcessing(true);
                      try {
                        const response = await apiRequest('/api/payments/coins/purchase', {
                          method: 'POST',
                          body: JSON.stringify({ packageType: pkg.id }),
                        });
                        const data = await response.json();
                        
                        if (data.checkoutUrl) {
                          window.location.href = data.checkoutUrl;
                        }
                      } catch (error: any) {
                        console.error('Coin purchase error:', error);
                        toast({
                          title: 'Purchase Error',
                          description: error.message || 'Could not initiate purchase. Please try again.',
                          variant: 'destructive',
                        });
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    data-testid={`button-purchase-coins-${pkg.id}`}
                  >
                    {isProcessing ? 'Processing...' : 'Purchase Now'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">Pro Tip:</strong> Subscriptions offer 5-10x better value per prompt! 
              Pro plan = $0.02/prompt vs $0.10-0.20/prompt for coins. Consider a subscription for regular use.
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                We accept all major credit cards, PayPal, and other payment methods through our secure payment provider Paddle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Is there a free trial?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Yes! Pro plan includes a 7-day free trial. No credit card required to start. Cancel anytime during the trial period.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens when I cancel?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You'll retain access to premium features until the end of your billing period. After that, you'll be moved to the Free plan automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
