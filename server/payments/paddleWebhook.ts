import type { RequestHandler } from "express";

export const handlePaddleWebhook: RequestHandler = async (req, res) => {
  res.json({ received: true });
};
