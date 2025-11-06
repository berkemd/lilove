// Cron jobs for scheduled tasks
import cron from 'node-cron';
import { db } from './storage';
import { users, userLoginStreaks } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';

// Configuration constants
const STREAK_RESET_HOURS = 48; // Hours of inactivity before streak resets
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const STREAK_RESET_MS = STREAK_RESET_HOURS * MILLISECONDS_PER_HOUR;

export function initializeCronJobs() {
  console.log('✅ Initializing cron jobs...');

  // Daily job to check login streaks (runs at midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running daily login streak check...');
      
      // Get all users with active streaks who haven't logged in within reset period
      const usersWithStreaks = await db.select()
        .from(users)
        .where(lt(users.lastLoginAt, new Date(Date.now() - STREAK_RESET_MS)));

      // Reset streaks for users who haven't logged in
      for (const user of usersWithStreaks) {
        if (user.loginStreak && user.loginStreak > 0) {
          await db.update(users)
            .set({ loginStreak: 0 })
            .where(eq(users.id, user.id));
          
          console.log(`Reset login streak for user ${user.id}`);
        }
      }
    } catch (error) {
      console.error('Error in login streak cron job:', error);
    }
  });

  // Weekly job to clean up expired data (runs every Sunday at 2 AM)
  cron.schedule('0 2 * * 0', async () => {
    try {
      console.log('Running weekly data cleanup...');
      
      // Add cleanup logic here
      // For example: delete old notifications, expired sessions, etc.
      
      console.log('Weekly cleanup completed');
    } catch (error) {
      console.error('Error in cleanup cron job:', error);
    }
  });

  console.log('✅ Cron jobs initialized');
}
