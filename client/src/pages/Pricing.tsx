import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string[];
  popular?: boolean;
}

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/pricing');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      setLocation('/auth');
      return;
    }

    setLoading(planId);
    try {
      const response = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          billingCycle: isYearly ? 'yearly' : 'monthly',
          currency: 'usd',
          provider: 'paddle',
          email: user.email
        })
      });

      const data = await response.json();

      if (response.ok && data.checkoutUrl) {
        // Redirect to payment processor
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message || 'Failed to create checkout session'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred. Please try again.'
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Growth Plan</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Unlock your full potential with premium features
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-6 py-2 rounded-md transition-colors ${
              !isYearly ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-6 py-2 rounded-md transition-colors ${
              isYearly ? 'bg-background shadow-sm' : 'hover:bg-background/50'
            }`}
          >
            Yearly
            <Badge className="ml-2" variant="secondary">Save 20%</Badge>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.popular ? 'border-primary shadow-lg scale-105' : ''
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                </span>
                <span className="text-muted-foreground">
                  /{isYearly ? 'year' : 'month'}
                </span>
              </div>
              <ul className="space-y-3">
                {(plan.features || []).map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id || plan.name === 'free'}
                variant={plan.popular ? 'default' : 'outline'}
              >
                {loading === plan.id
                  ? 'Processing...'
                  : plan.name === 'free'
                  ? 'Current Plan'
                  : 'Subscribe Now'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* FAQ or Additional Info */}
      <div className="mt-16 text-center text-sm text-muted-foreground">
        <p>All plans include a 14-day money-back guarantee</p>
        <p className="mt-2">Need help? Contact us at support@lilove.org</p>
      </div>
    </div>
  );
}
