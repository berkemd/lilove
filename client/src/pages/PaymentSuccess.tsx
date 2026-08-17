import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, ArrowRight, Coins, Crown, Star, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentDetails {
  transactionId: string;
  type: 'subscription' | 'coins';
  amount: number;
  planName?: string;
  coinAmount?: number;
  bonusCoins?: number;
}

export default function PaymentSuccess() {
  const { user } = useAuth();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  
  // Extract payment details from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') as 'subscription' | 'coins';
    const transactionId = urlParams.get('transactionId') || '';
    const amount = parseFloat(urlParams.get('amount') || '0');
    const planName = urlParams.get('planName') || undefined;
    const coinAmount = parseInt(urlParams.get('coinAmount') || '0') || undefined;
    const bonusCoins = parseInt(urlParams.get('bonusCoins') || '0') || undefined;
    
    if (type && transactionId) {
      setPaymentDetails({
        type,
        transactionId,
        amount,
        planName,
        coinAmount,
        bonusCoins
      });
    }
  }, []);

  // Refresh user data to get updated subscription/coins
  const { refetch: refetchUser } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: false
  });

  useEffect(() => {
    // Refresh user data after successful payment
    const timer = setTimeout(() => {
      refetchUser();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [refetchUser]);

  if (!paymentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading payment details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="relative">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="absolute -top-2 -right-2"
                >
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
            <CardTitle className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              Payment Successful!
            </CardTitle>
            
            <p className="text-muted-foreground text-lg">
              Thank you for your payment. Your {paymentDetails.type === 'subscription' ? 'subscription' : 'coins'} {paymentDetails.type === 'subscription' ? 'has been activated' : 'have been added to your account'}.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {paymentDetails.type === 'subscription' ? (
                  <>
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Subscription Details
                  </>
                ) : (
                  <>
                    <Coins className="w-5 h-5 text-amber-500" />
                    Coin Purchase Details
                  </>
                )}
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <p className="font-mono text-xs mt-1 break-all">
                    {paymentDetails.transactionId}
                  </p>
                </div>
                
                <div>
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <p className="font-semibold">${paymentDetails.amount.toFixed(2)} USD</p>
                </div>
                
                {paymentDetails.type === 'subscription' && paymentDetails.planName && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Plan:</span>
                    <Badge variant="secondary" className="ml-2">
                      {paymentDetails.planName}
                    </Badge>
                  </div>
                )}
                
                {paymentDetails.type === 'coins' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Coins Received:</span>
                      <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Coins className="w-4 h-4" />
                        {paymentDetails.coinAmount?.toLocaleString()}
                      </p>
                    </div>
                    
                    {paymentDetails.bonusCoins && paymentDetails.bonusCoins > 0 && (
                      <div>
                        <span className="text-muted-foreground">Bonus Coins:</span>
                        <p className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Gift className="w-4 h-4" />
                          +{paymentDetails.bonusCoins.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Success Features */}
            {paymentDetails.type === 'subscription' && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  What's Next?
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Access to premium features activated
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Advanced analytics and insights
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Priority support and assistance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited goals and tasks
                  </li>
                </ul>
              </div>
            )}
            
            {paymentDetails.type === 'coins' && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Your Coins Are Ready!
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Use coins for premium AI coaching
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlock special challenges and rewards
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Boost your performance metrics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Access exclusive content and features
                  </li>
                </ul>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                asChild 
                className="flex-1" 
                size="lg"
                data-testid="button-go-dashboard"
              >
                <Link href="/">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
              
              {paymentDetails.type === 'subscription' && (
                <Button 
                  asChild 
                  variant="outline" 
                  className="flex-1" 
                  size="lg"
                  data-testid="button-view-analytics"
                >
                  <Link href="/analytics">
                    <Star className="w-4 h-4 mr-2" />
                    View Analytics
                  </Link>
                </Button>
              )}
              
              {paymentDetails.type === 'coins' && (
                <Button 
                  asChild 
                  variant="outline" 
                  className="flex-1" 
                  size="lg"
                  data-testid="button-view-coach"
                >
                  <Link href="/coach">
                    <Coins className="w-4 h-4 mr-2" />
                    Use AI Coach
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Receipt Information */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>A receipt has been sent to your email.</p>
              <p>For support, contact us with transaction ID: <code className="bg-muted px-1 rounded">{paymentDetails.transactionId}</code></p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}