import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Sparkles, Lock, ChevronRight, Star, Zap, Trophy } from 'lucide-react';

interface UpgradePromptProps {
  title?: string;
  description?: string;
  feature?: string;
  requiredTier?: 'pro' | 'team' | 'enterprise';
  variant?: 'inline' | 'modal' | 'banner';
  onClose?: () => void;
}

export function UpgradePrompt({
  title = 'Upgrade to Unlock',
  description = 'This feature requires a premium subscription',
  feature,
  requiredTier = 'pro',
  variant = 'inline',
  onClose,
}: UpgradePromptProps) {
  const [, navigate] = useLocation();

  const handleUpgrade = () => {
    navigate('/pricing');
    onClose?.();
  };

  const getTierBenefits = () => {
    switch (requiredTier) {
      case 'pro':
        return [
          'Unlimited goals and tasks',
          'Advanced AI coaching',
          'Full analytics dashboard',
          'Priority support',
          'Custom themes',
        ];
      case 'team':
        return [
          'Everything in Pro',
          'Team collaboration',
          'Shared goals',
          'Team analytics',
          'Admin controls',
        ];
      case 'enterprise':
        return [
          'Everything in Team',
          'White-label options',
          'API access',
          'Dedicated support',
          'Custom integrations',
        ];
      default:
        return [];
    }
  };

  if (variant === 'modal') {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Crown className="h-8 w-8 text-primary" />
              </div>
              
              {feature && (
                <p className="text-lg font-semibold mb-2">
                  Unlock "{feature}"
                </p>
              )}
              
              <p className="text-sm text-muted-foreground">
                Upgrade to {requiredTier.toUpperCase()} to access this feature and more!
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">What you'll get:</h4>
              <ul className="text-sm space-y-1">
                {getTierBenefits().slice(0, 3).map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Maybe Later
            </Button>
            <Button onClick={handleUpgrade}>
              View Pricing
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Crown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button onClick={handleUpgrade} size="sm">
            Upgrade Now
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title}
          </CardTitle>
          <Badge variant="secondary">
            {requiredTier.toUpperCase()} PLAN
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        {feature && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">
              You're trying to access: <span className="text-primary">{feature}</span>
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Unlock these benefits:
          </h4>
          <ul className="space-y-2 text-sm">
            {getTierBenefits().map((benefit, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button className="w-full" onClick={handleUpgrade}>
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to {requiredTier.toUpperCase()}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Quick upgrade button for inline use
export function QuickUpgradeButton({ 
  tier = 'pro',
  className = '',
}: { 
  tier?: 'pro' | 'team' | 'enterprise';
  className?: string;
}) {
  const [, navigate] = useLocation();
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={`gap-1 ${className}`}
      onClick={() => navigate('/pricing')}
      data-testid="button-quick-upgrade"
    >
      <Crown className="h-3 w-3" />
      Upgrade to {tier}
    </Button>
  );
}

// Coin purchase prompt
export function CoinPurchasePrompt({
  requiredCoins,
  currentBalance = 0,
  purpose,
  onClose,
}: {
  requiredCoins: number;
  currentBalance?: number;
  purpose?: string;
  onClose?: () => void;
}) {
  const [, navigate] = useLocation();
  const coinsNeeded = Math.max(0, requiredCoins - currentBalance);
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Need More Coins
          </DialogTitle>
          <DialogDescription>
            {purpose ? `To ${purpose}, you need ${requiredCoins} coins.` : `This action requires ${requiredCoins} coins.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Your balance</p>
              <p className="text-xl font-bold">{currentBalance} coins</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Required</p>
              <p className="text-xl font-bold text-primary">{requiredCoins} coins</p>
            </div>
          </div>
          
          {coinsNeeded > 0 && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                You need <span className="font-semibold text-foreground">{coinsNeeded} more coins</span>
              </p>
              <Badge variant="secondary">
                Suggested: Buy {Math.ceil(coinsNeeded / 100) * 100} coins for ${Math.ceil(coinsNeeded / 100)}
              </Badge>
            </div>
          )}
          
          <div className="space-y-2 text-sm">
            <p className="font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Ways to earn free coins:
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Daily login: 10 coins</li>
              <li>• Complete a goal: 50 coins</li>
              <li>• 7-day streak: 100 coins</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => {
            navigate('/pricing?tab=coins');
            onClose?.();
          }}>
            Buy Coins
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}