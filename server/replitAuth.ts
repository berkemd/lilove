import type { Express, RequestHandler } from "express";

export function setupAuth(app: Express) {
  console.log("✅ Replit Auth setup (stub)");
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  next();
};
