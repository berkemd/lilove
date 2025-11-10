/**
 * Local Database Configuration
 * Uses SQLite for development when PostgreSQL is not available
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';

// Initialize SQLite database
const sqlite = new Database('./local.db');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');

// Mock database interface that matches Drizzle ORM API
export const db = {
  select: () => ({
    from: (table: any) => ({
      where: (condition: any) => ({
        limit: (n: number) => [],
        orderBy: (...args: any[]) => [],
        then: (resolve: any) => resolve([]),
      }),
      orderBy: (...args: any[]) => ({
        limit: (n: number) => [],
        then: (resolve: any) => resolve([]),
      }),
      then: (resolve: any) => resolve([]),
    }),
  }),
  
  insert: (table: any) => ({
    values: (data: any) => ({
      returning: () => ({
        then: (resolve: any) => {
          // Simple insert logic for common tables
          const id = data.id || crypto.randomBytes(16).toString('hex');
          const now = new Date().toISOString();
          
          // Mock successful insert
          resolve([{ ...data, id, createdAt: now, updatedAt: now }]);
        },
      }),
      onConflictDoUpdate: (config: any) => ({
        returning: () => ({
          then: (resolve: any) => {
            const id = data.id || crypto.randomBytes(16).toString('hex');
            const now = new Date().toISOString();
            resolve([{ ...data, id, updatedAt: now }]);
          },
        }),
      }),
      then: (resolve: any) => resolve(),
    }),
  }),
  
  update: (table: any) => ({
    set: (data: any) => ({
      where: (condition: any) => ({
        then: (resolve: any) => resolve(),
      }),
    }),
  }),
  
  delete: (table: any) => ({
    where: (condition: any) => ({
      then: (resolve: any) => resolve(),
    }),
  }),
  
  execute: (sql: any) => ({
    then: (resolve: any) => {
      try {
        // Handle SQL template strings
        if (sql && sql.strings) {
          const query = sql.strings.join('?');
          sqlite.exec(query);
        } else if (typeof sql === 'string') {
          sqlite.exec(sql);
        }
        resolve();
      } catch (error) {
        console.error('SQL execution error:', error);
        resolve();
      }
    },
  }),
};

// Export a simplified storage implementation
export const localStorage = {
  async getUser(id: string): Promise<any> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM users WHERE id = ?');
      return stmt.get(id);
    } catch {
      return null;
    }
  },

  async getUserByEmail(email: string): Promise<any> {
    try {
      const stmt = sqlite.prepare('SELECT * FROM users WHERE email = ?');
      return stmt.get(email);
    } catch {
      return null;
    }
  },

  async upsertUser(userData: any): Promise<any> {
    try {
      const existing = await this.getUserByEmail(userData.email);
      const now = new Date().toISOString();
      
      if (existing) {
        const stmt = sqlite.prepare(`
          UPDATE users SET 
            first_name = ?, last_name = ?, display_name = ?,
            profile_image_url = ?, updated_at = ?, last_login_at = ?
          WHERE id = ?
        `);
        
        stmt.run(
          userData.firstName || existing.first_name,
          userData.lastName || existing.last_name, 
          userData.displayName || existing.display_name,
          userData.profileImageUrl || existing.profile_image_url,
          now, now, existing.id
        );
        
        return await this.getUser(existing.id);
      } else {
        const id = userData.id || crypto.randomBytes(16).toString('hex');
        
        const stmt = sqlite.prepare(`
          INSERT INTO users (
            id, email, first_name, last_name, display_name,
            profile_image_url, created_at, updated_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          id, userData.email,
          userData.firstName || null,
          userData.lastName || null,
          userData.displayName || null,
          userData.profileImageUrl || null,
          now, now, 1
        );
        
        // Create default profile
        const profileStmt = sqlite.prepare(`
          INSERT OR IGNORE INTO user_profiles (
            user_id, learning_style, preferred_pace, difficulty_preference,
            current_level, total_xp, streak_count, longest_streak
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        profileStmt.run(id, 'mixed', 'medium', 'incremental', 1, 0, 0, 0);
        
        return await this.getUser(id);
      }
    } catch (error) {
      console.error('Error upserting user:', error);
      return userData;
    }
  },
};