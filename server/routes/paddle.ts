import { Router } from 'express';
import { handlePaddleWebhook } from '../payments/paddleWebhook';

const router = Router();

// Paddle webhook endpoint
router.post('/webhook', handlePaddleWebhook);

export default router;
