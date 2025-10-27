// Behavioral Routes - Advanced behavioral analytics and patterns
import { Express } from 'express';
import { isAuthenticated } from './replitAuth';
import { analyticsService } from './analytics';

export function registerBehavioralRoutes(app: Express) {
  // Get user behavioral insights
  app.get('/api/behavioral/insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const insights = await analyticsService.getInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error('Error fetching behavioral insights:', error);
      res.status(500).json({ message: 'Failed to fetch insights' });
    }
  });

  // Track behavioral event
  app.post('/api/behavioral/track', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { eventType, eventData } = req.body;
      
      await analyticsService.trackEvent(userId, eventType, eventData);
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking behavioral event:', error);
      res.status(500).json({ message: 'Failed to track event' });
    }
  });
}
