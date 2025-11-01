import { Router } from 'express';

const router = Router();

// Paddle routes are handled in the main routes.ts file
// This file exists to satisfy the import but routes are defined inline
import { Router } from "express";

const router = Router();

router.post("/webhook", (req, res) => {
  res.json({ received: true });
});

export default router;
