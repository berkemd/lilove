import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Crown, Zap, Download, Palette, Sparkles, X } from "lucide-react";
import { useState } from "react";

interface PremiumPaywallProps {
  feature?: string;
  onUpgrade?: () => void;
}

export default function PremiumPaywall({ feature = "Premium Features", onUpgrade }: PremiumPaywallProps) {
  const [showDialog, setShowDialog] = useState(false);

  const features = [
    { icon: Download, title: "HD Export (1080p)", description: "Export videos in full HD quality" },
    { icon: Palette, title: "Advanced Themes", description: "Access 20+ premium visualization themes" },
    { icon: Sparkles, title: "AI Theme Generator", description: "Generate custom themes with AI" },
    { icon: Zap, title: "Unlimited Exports", description: "No limits on video exports" },
  ];

  const plans = [
    {
      name: "Pro Monthly",
      price: "$4.99",
      period: "/month",
      popular: false,
      features: ["1080p exports", "All themes", "AI generation", "Priority support"]
    },
    {
      name: "Pro Annual",
      price: "$39.99",
      period: "/year", 
      popular: true,
      features: ["Everything in Pro", "33% savings", "Early access", "Premium templates"]
    },
    {
      name: "Lifetime",
      price: "$59.99",
      period: "one-time",
      popular: false,
      features: ["All Pro features", "Lifetime access", "Future updates", "VIP support"]
    }
  ];

  const handleUpgrade = (plan: string) => {
    console.log('Upgrade to plan:', plan);
    onUpgrade?.();
    setShowDialog(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Card className="border-2 border-dashed border-sidebar-primary/50 bg-gradient-to-br from-sidebar-primary/5 to-sidebar-accent/5 hover-elevate cursor-pointer">
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <Crown className="h-16 w-16 mx-auto text-sidebar-primary animate-glow" />
              <h3 className="text-xl font-semibold">Unlock {feature}</h3>
              <p className="text-muted-foreground">
                Get premium access to advanced visualizations and HD exports
              </p>
              <Button 
                className="bg-gradient-to-r from-sidebar-primary to-sidebar-accent hover-elevate"
                data-testid="button-unlock-premium"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display bg-gradient-to-r from-sidebar-primary to-sidebar-accent bg-clip-text text-transparent">
            Upgrade to Premium
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Feature Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-card border">
                <feature.icon className="h-5 w-5 text-sidebar-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative hover-elevate ${
                plan.popular ? 'border-sidebar-primary shadow-lg scale-105' : ''
              }`}>
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-sidebar-primary to-sidebar-accent">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="space-y-1">
                    <div className="text-3xl font-bold font-display text-sidebar-primary">
                      {plan.price}
                    </div>
                    <div className="text-sm text-muted-foreground">{plan.period}</div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm">
                        <Sparkles className="h-4 w-4 text-sidebar-accent mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full hover-elevate ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-sidebar-primary to-sidebar-accent' 
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleUpgrade(plan.name)}
                    data-testid={`button-upgrade-${plan.name.toLowerCase().replace(' ', '-')}`}
                  >
                    Choose {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Social Proof */}
          <div className="text-center space-y-4 p-6 bg-gradient-to-r from-sidebar-primary/10 to-sidebar-accent/10 rounded-lg">
            <div className="flex justify-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-sidebar-primary">10K+</div>
                <div className="text-sm text-muted-foreground">Videos Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-sidebar-accent">4.9★</div>
                <div className="text-sm text-muted-foreground">User Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-chart-3">99%</div>
                <div className="text-sm text-muted-foreground">Satisfaction</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              "The AI themes are incredible! My music videos went viral on TikTok." - @musicproducer
            </p>
          </div>

          {/* Money Back Guarantee */}
          <div className="text-center text-sm text-muted-foreground">
            30-day money-back guarantee • Cancel anytime • Secure payment
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}