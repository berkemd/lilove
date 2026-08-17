import express, { Request, Response, NextFunction } from 'express';
import { paddleService, PLANS } from '../services/paddleService';
import { authenticate, createRateLimiter } from '../middleware/auth';
import { db } from '../db';
import { paymentTransactions } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

// Rate limiter for payment endpoints
const paymentRateLimit = createRateLimiter(
  60 * 60 * 1000, // 1 hour window
  10, // max 10 payment attempts per hour
  'Too many payment attempts. Please try again later.'
);

// Get Paddle configuration (client token)
router.get('/config', (req: Request, res: Response) => {
  const clientToken = process.env.PADDLE_CLIENT_TOKEN;
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
  
  if (!clientToken) {
    return res.status(500).json({
      error: 'Paddle not configured',
      message: 'Payment system is not configured. Please contact support.',
    });
  }
  
  res.json({
    clientToken,
    environment,
  });
});

// Get available subscription plans
router.get('/plans', (req: Request, res: Response) => {
  res.json({
    plans: PLANS,
    currency: 'USD',
    features: {
      free: [
        '5 goals limit',
        '3 habits limit',
        'Basic analytics',
        'Community support',
      ],
      premium: [
        'Unlimited goals & habits',
        'Advanced analytics',
        'AI coaching',
        'Priority support',
        'Custom themes',
        'Export data',
        'No ads',
      ],
    },
  });
});

// Create checkout session
router.post('/checkout', 
  authenticate,
  paymentRateLimit,
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const { planId, tier, billingCycle } = req.body;
      
      // Support both planId and tier+billingCycle formats
      let selectedPlanId = planId;
      
      if (!selectedPlanId && tier && billingCycle) {
        // Map tier + billingCycle to planId
        // tier='pro' + billingCycle='monthly' → planId='monthly'
        // tier='pro' + billingCycle='yearly' → planId='yearly'
        if (tier === 'pro') {
          selectedPlanId = billingCycle === 'monthly' ? 'monthly' : 'yearly';
        } else if (tier === 'team') {
          selectedPlanId = billingCycle === 'monthly' ? 'team_monthly' : 'team_yearly';
        }
      }
      
      if (!selectedPlanId) {
        return res.status(400).json({ 
          error: 'Missing plan information',
          message: 'Please select a subscription plan' 
        });
      }

      const userId = req.user.id;
      const email = req.user.email;

      if (!email) {
        return res.status(400).json({ 
          error: 'Email required',
          message: 'Email address is required for subscription' 
        });
      }

      const result = await paddleService.createCheckout(userId, selectedPlanId, email);

      res.json({
        checkoutUrl: result.checkoutUrl,
        transactionId: result.transactionId,
        planId: selectedPlanId,
        status: 'pending',
      });
    } catch (error: any) {
      console.error('Checkout error:', error);
      next(error);
    }
});

// Webhook endpoint (Paddle sends events here)
// SECURITY: This endpoint needs to verify Paddle signature
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['paddle-signature'] as string;
      
      if (!signature) {
        console.error('Missing Paddle webhook signature');
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Missing webhook signature' 
        });
      }

      // Process webhook with signature verification
      await paddleService.handleWebhook(signature, req.body);

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      
      // Return 200 to prevent Paddle from retrying on processing errors
      // But log the error for investigation
      res.status(200).json({ 
        received: true, 
        error: 'Processing failed but acknowledged' 
      });
    }
});

// Get user subscription status
router.get('/subscription', 
  authenticate,
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const subscription = await paddleService.getSubscription(userId);

      if (!subscription) {
        return res.json({
          hasSubscription: false,
          tier: 'free',
          features: PLANS[0].features,
        });
      }

      res.json({
        hasSubscription: true,
        subscription,
        features: PLANS.find(p => p.id === subscription.tier)?.features || [],
      });
    } catch (error: any) {
      console.error('Get subscription error:', error);
      next(error);
    }
});

// Cancel subscription
router.post('/subscription/cancel', 
  authenticate,
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const result = await paddleService.cancelSubscription(userId);
      res.json(result);
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      next(error);
    }
});

// Resume subscription
router.post('/subscription/resume', 
  authenticate,
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const result = await paddleService.resumeSubscription(userId);
      res.json(result);
    } catch (error: any) {
      console.error('Resume subscription error:', error);
      next(error);
    }
});

// Get payment history
router.get('/transactions', 
  authenticate,
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      
      const transactions = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.userId, userId))
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(50);

      res.json({
        transactions,
        total: transactions.length,
      });
    } catch (error: any) {
      console.error('Get transactions error:', error);
      next(error);
    }
});

// Verify payment status (for client-side confirmation)
router.get('/verify/:transactionId', 
  authenticate,
  async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.params;
      const userId = req.user.id;

      const transaction = await db.select()
        .from(paymentTransactions)
        .where(
          eq(paymentTransactions.externalTransactionId, transactionId)
        )
        .limit(1);

      if (transaction.length === 0) {
        return res.status(404).json({ 
          error: 'Transaction not found',
          message: 'Payment transaction not found' 
        });
      }

      // Verify ownership
      if (transaction[0].userId !== userId) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have access to this transaction' 
        });
      }

      res.json({
        status: transaction[0].status,
        amount: transaction[0].amount,
        currency: transaction[0].currency,
        completedAt: transaction[0].completedAt,
      });
    } catch (error: any) {
      console.error('Verify payment error:', error);
      next(error);
    }
});

export default router;