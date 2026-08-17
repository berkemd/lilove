import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from 'wouter';
import { 
  XCircle, 
  RefreshCw, 
  ArrowLeft, 
  AlertTriangle, 
  CreditCard,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PaymentFailureDetails {
  transactionId?: string;
  type?: 'subscription' | 'coins';
  amount?: number;
  error?: string;
  errorCode?: string;
}

export default function PaymentFailure() {
  const [failureDetails, setFailureDetails] = useState<PaymentFailureDetails | null>(null);
  
  // Extract failure details from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') as 'subscription' | 'coins';
    const transactionId = urlParams.get('transactionId') || undefined;
    const amount = parseFloat(urlParams.get('amount') || '0') || undefined;
    const error = urlParams.get('error') || undefined;
    const errorCode = urlParams.get('errorCode') || undefined;
    
    setFailureDetails({
      type,
      transactionId,
      amount,
      error,
      errorCode
    });
  }, []);

  const getErrorMessage = (error?: string, errorCode?: string) => {
    if (error) return error;
    if (errorCode) {
      switch (errorCode) {
        case 'insufficient_funds':
          return 'Insufficient funds in your wallet or payment method.';
        case 'transaction_timeout':
          return 'The transaction timed out. Please try again.';
        case 'payment_declined':
          return 'Your payment was declined by the payment provider.';
        case 'network_error':
          return 'Network error occurred. Please check your connection and try again.';
        case 'invalid_amount':
          return 'The payment amount is invalid or below the minimum required.';
        default:
          return 'An unexpected error occurred during payment processing.';
      }
    }
    return 'Payment could not be completed. Please try again.';
  };

  const getErrorSeverity = (errorCode?: string) => {
    switch (errorCode) {
      case 'insufficient_funds':
      case 'payment_declined':
        return 'warning';
      case 'network_error':
      case 'transaction_timeout':
        return 'default';
      default:
        return 'destructive';
    }
  };

  const getRetryButton = () => {
    if (!failureDetails?.type) return null;
    
    const retryPath = failureDetails.type === 'subscription' ? '/pricing' : '/pricing';
    return (
      <Button asChild size="lg" data-testid="button-retry-payment">
        <Link href={retryPath}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Link>
      </Button>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-2 border-red-200 dark:border-red-800">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="relative">
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="absolute -top-2 -right-2"
                >
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-white" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
            
            <CardTitle className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
              Payment Failed
            </CardTitle>
            
            <p className="text-muted-foreground text-lg">
              We couldn't process your payment. Don't worry, no charges were made to your account.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Error Details */}
            <Alert variant={getErrorSeverity(failureDetails?.errorCode) as any}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <strong>Error:</strong> {getErrorMessage(failureDetails?.error, failureDetails?.errorCode)}
              </AlertDescription>
            </Alert>
            
            {/* Payment Details */}
            {(failureDetails?.transactionId || failureDetails?.amount) && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  Payment Details
                </h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {failureDetails.transactionId && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <p className="font-mono text-xs mt-1 break-all">
                        {failureDetails.transactionId}
                      </p>
                    </div>
                  )}
                  
                  {failureDetails.type && (
                    <div>
                      <span className="text-muted-foreground">Payment Type:</span>
                      <Badge variant="outline" className="ml-2">
                        {failureDetails.type === 'subscription' ? 'Subscription' : 'Coin Purchase'}
                      </Badge>
                    </div>
                  )}
                  
                  {failureDetails.amount && (
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-semibold">${failureDetails.amount.toFixed(2)} USD</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Troubleshooting Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                Troubleshooting Tips
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />
                  <span>Ensure you have sufficient funds in your wallet or payment method</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />
                  <span>Check your internet connection and try again</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />
                  <span>Verify your payment information is correct</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />
                  <span>Try using a different payment method</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2" />
                  <span>Contact your bank if the payment was unexpectedly declined</span>
                </li>
              </ul>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {getRetryButton()}
              
              <Button 
                asChild 
                variant="outline" 
                className="flex-1" 
                size="lg"
                data-testid="button-back-to-dashboard"
              >
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                className="flex-1" 
                size="lg"
                data-testid="button-contact-support"
              >
                <Link href="/settings">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Support
                </Link>
              </Button>
            </div>
            
            {/* Additional Payment Options */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Alternative Payment Methods</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  asChild 
                  variant="ghost" 
                  size="sm"
                  data-testid="button-try-different-method"
                >
                  <Link href="/pricing">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Try Different Method
                  </Link>
                </Button>
                
                <Button 
                  asChild 
                  variant="ghost" 
                  size="sm"
                  data-testid="button-payment-help"
                >
                  <Link href="/settings">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Payment Help
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Support Information */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Still having trouble? Our support team is here to help.</p>
              {failureDetails?.transactionId && (
                <p>Reference ID: <code className="bg-muted px-1 rounded">{failureDetails.transactionId}</code></p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}