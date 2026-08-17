import cron from 'node-cron';
import { storage } from './storage';
import { addDays, startOfWeek, endOfWeek, setHours, setMinutes } from 'date-fns';

// ===== LEAGUE SEASON MANAGEMENT =====

// Start a new league season every Monday at 00:00
export function startNewLeagueSeasons() {
  cron.schedule('0 0 * * 1', async () => {
    try {
      console.log('[League Cron] Starting new league seasons...');
      
      const leagues = await storage.getAllLeagues();
      
      for (const league of leagues) {
        const activeSeason = await storage.getActiveSeason(league.id);
        
        if (!activeSeason) {
          const now = new Date();
          const startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
          const endDate = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
          
          const lastSeasons = await storage.getAllActiveSeasons();
          const seasonNumber = lastSeasons.length + 1;
          
          await storage.createLeagueSeason({
            seasonNumber,
            leagueId: league.id,
            startDate: setHours(setMinutes(startDate, 0), 0),
            endDate: setHours(setMinutes(endDate, 59), 23),
            status: 'active',
            maxParticipants: 50,
            currentParticipants: 0,
          });
          
          console.log(`[League Cron] Started new season for ${league.name} league`);
        }
      }
    } catch (error) {
      console.error('[League Cron] Error starting new seasons:', error);
    }
  });
}

// End league season every Sunday at 23:59
export function endLeagueSeasons() {
  cron.schedule('59 23 * * 0', async () => {
    try {
      console.log('[League Cron] Ending active league seasons...');
      
      const activeSeasons = await storage.getAllActiveSeasons();
      
      for (const season of activeSeasons) {
        console.log(`[League Cron] Ending season ${season.id}...`);
        
        await storage.updateLeagueRankings(season.id);
        
        await storage.distributeLeagueRewards(season.id);
        
        await storage.promoteAndRelegate(season.id);
        
        await storage.endLeagueSeason(season.id);
        
        console.log(`[League Cron] Season ${season.id} ended successfully`);
      }
    } catch (error) {
      console.error('[League Cron] Error ending seasons:', error);
    }
  });
}

// Update league rankings every hour
export function updateLeagueRankings() {
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[League Cron] Updating league rankings...');
      
      const activeSeasons = await storage.getAllActiveSeasons();
      
      for (const season of activeSeasons) {
        await storage.updateLeagueRankings(season.id);
      }
      
      console.log('[League Cron] League rankings updated successfully');
    } catch (error) {
      console.error('[League Cron] Error updating rankings:', error);
    }
  });
}

// ===== ACCOUNT DELETION PROCESSING =====

// Process scheduled account deletions daily at 2 AM
export function processScheduledDeletions() {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Deletion Cron] Processing scheduled account deletions...');
      
      const pendingDeletions = await storage.getScheduledAccountDeletions();
      
      for (const deletion of pendingDeletions) {
        try {
          console.log(`[Deletion Cron] Processing deletion for user ${deletion.userId}`);
          
          // Mark as in progress
          await storage.processAccountDeletion(deletion.id);
          
          // Permanently delete the account
          await storage.permanentlyDeleteAccount(deletion.userId);
          
          console.log(`[Deletion Cron] Successfully deleted account ${deletion.userId}`);
        } catch (error) {
          console.error(`[Deletion Cron] Error deleting account ${deletion.userId}:`, error);
        }
      }
      
      console.log('[Deletion Cron] Finished processing deletions');
    } catch (error) {
      console.error('[Deletion Cron] Error in deletion cron job:', error);
    }
  });
}

// ===== OAUTH STATE CLEANUP =====

// Clean up expired OAuth states from database every 15 minutes
// This prevents database pollution from abandoned OAuth flows
export function cleanupExpiredOAuthStates() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('[OAuth Cron] Cleaning up expired OAuth states...');
      
      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      
      // Ensure table exists (in case no OAuth flow has run yet)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS oauth_states (
          state TEXT PRIMARY KEY,
          user_id TEXT,
          popup BOOLEAN,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Delete expired states from database
      const result = await db.execute(sql`
        DELETE FROM oauth_states WHERE expires_at < NOW()
      `);
      
      const deletedCount = (result as any).rowCount || 0;
      
      if (deletedCount > 0) {
        console.log(`[OAuth Cron] Cleaned up ${deletedCount} expired OAuth states`);
      }
    } catch (error) {
      console.error('[OAuth Cron] Error cleaning up OAuth states:', error);
    }
  });
}

// ===== AI USAGE ANALYTICS AGGREGATION =====

// Aggregate AI usage stats daily at 3 AM
export function aggregateAIUsageDaily() {
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[AI Usage Cron] Starting daily AI usage aggregation...');
      
      const { aiUsageAnalytics } = await import('./analytics/aiUsage');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await aiUsageAnalytics.aggregateDaily(yesterday);
      
      console.log('[AI Usage Cron] Daily aggregation completed successfully');
    } catch (error) {
      console.error('[AI Usage Cron] Error aggregating AI usage:', error);
    }
  });
}

// Initialize all cron jobs
export function initializeCronJobs() {
  // Skip cron job initialization in test environment
  if (process.env.NODE_ENV === 'test') {
    console.log('[Cron] Skipping cron job initialization (test environment)');
    return;
  }

  console.log('[Cron] Initializing all scheduled jobs...');
  
  // League management
  startNewLeagueSeasons();
  endLeagueSeasons();
  updateLeagueRankings();
  
  // Security & maintenance
  processScheduledDeletions();
  cleanupExpiredOAuthStates();
  
  // AI analytics
  aggregateAIUsageDaily();
  
  console.log('[Cron] ✅ All cron jobs initialized successfully');
  console.log('[Cron]    - League seasons (Mon 00:00, Sun 23:59, hourly rankings)');
  console.log('[Cron]    - Account deletions (daily at 02:00)');
  console.log('[Cron]    - OAuth state cleanup (every 15 minutes)');
  console.log('[Cron]    - AI usage aggregation (daily at 03:00)');
}
