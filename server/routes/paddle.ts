import { Router } from 'express';

const router = Router();

router.post("/webhook", (req, res) => {
  res.json({ received: true });
});

export default router;
