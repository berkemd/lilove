import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "Up to 5 active goals",
        "Basic task management",
        "7-day streak tracking",
        "Community access",
        "Mobile app access"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "per month",
      description: "For serious achievers",
      features: [
        "Unlimited goals and tasks",
        "AI coaching sessions",
        "Advanced analytics",
        "Priority support",
        "Team collaboration",
        "Achievement badges",
        "Streak freeze (2x/month)",
        "Ad-free experience"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Pro",
      price: "$19.99",
      period: "per month",
      description: "Maximum performance",
      features: [
        "Everything in Premium",
        "Unlimited AI coaching",
        "Custom integrations",
        "White-label options",
        "API access",
        "Dedicated support",
        "Advanced reporting",
        "Team management tools"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Start free, upgrade as you grow
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.popular ? "border-primary shadow-lg" : ""}>
            <CardHeader>
              {plan.popular && (
                <Badge className="w-fit mb-2">Most Popular</Badge>
              )}
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant={plan.popular ? "default" : "outline"}>
                <Link href="/auth">{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
