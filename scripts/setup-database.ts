#!/usr/bin/env tsx
/**
 * Database Setup Script
 * Creates and configures the PostgreSQL database for LiLove
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as pg from 'pg';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

// Load environment variables
dotenv.config();

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  // For local development, use SQLite as a fallback
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) {
    console.log('📦 Using SQLite for local development...');
    
    // Update DATABASE_URL for SQLite
    process.env.DATABASE_URL = 'file:./local.db';
    
    // Import SQLite driver
    const { default: Database } = await import('better-sqlite3');
    const sqlite = new Database('./local.db');
    
    // Create tables using raw SQL for SQLite
    const createTablesSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        display_name TEXT,
        profile_image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME,
        is_active BOOLEAN DEFAULT 1,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        subscription_status TEXT DEFAULT 'free',
        coins INTEGER DEFAULT 0,
        two_factor_enabled BOOLEAN DEFAULT 0,
        streak_start_date DATE
      );

      -- User Profiles table
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL UNIQUE,
        bio TEXT,
        learning_style TEXT DEFAULT 'mixed',
        preferred_pace TEXT DEFAULT 'medium',
        difficulty_preference TEXT DEFAULT 'incremental',
        current_level INTEGER DEFAULT 1,
        total_xp INTEGER DEFAULT 0,
        streak_count INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        consistency_rating TEXT DEFAULT '0',
        adaptability_score TEXT DEFAULT '0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Goals table
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'personal',
        status TEXT DEFAULT 'active',
        priority TEXT DEFAULT 'medium',
        deadline DATE,
        progress TEXT DEFAULT '0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Tasks table
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        goal_id TEXT NOT NULL,
        plan_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date DATE,
        estimated_minutes INTEGER,
        time_spent INTEGER DEFAULT 0,
        is_timer_running BOOLEAN DEFAULT 0,
        started_at DATETIME,
        paused_at DATETIME,
        completed_at DATETIME,
        total_pause_time INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        depth INTEGER DEFAULT 0,
        parent_task_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
      );

      -- Achievements table
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        tier TEXT DEFAULT 'bronze',
        xp_reward INTEGER DEFAULT 0,
        rarity TEXT DEFAULT 'common',
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- User Achievements table
      CREATE TABLE IF NOT EXISTS user_achievements (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        achievement_id TEXT NOT NULL,
        goal_id TEXT,
        progress INTEGER DEFAULT 0,
        current_tier TEXT DEFAULT 'bronze',
        showcased BOOLEAN DEFAULT 0,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
      );

      -- Connected Accounts table (for OAuth)
      CREATE TABLE IF NOT EXISTS connected_accounts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_user_id TEXT NOT NULL,
        email TEXT,
        display_name TEXT,
        profile_image_url TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_sync_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(provider, provider_user_id)
      );

      -- OAuth States table (for CSRF protection)
      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        user_id TEXT,
        popup BOOLEAN DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
      CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON connected_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
    `;

    // Execute the SQL
    const statements = createTablesSQL.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          sqlite.exec(statement);
        } catch (error) {
          console.error('Error executing statement:', statement.substring(0, 100) + '...');
          console.error(error);
        }
      }
    }

    console.log('✅ SQLite database created successfully!');
    console.log('📍 Database location: ./local.db\n');
    
    // Clean up old OAuth states periodically
    sqlite.exec("DELETE FROM oauth_states WHERE expires_at < datetime('now')");
    
    sqlite.close();
    return;
  }

  // For production PostgreSQL
  try {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Run migrations
    const db = drizzle(client);
    
    // Create extensions if needed
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    
    console.log('🔄 Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('✅ Database setup complete!');
    
    await client.end();
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase().catch(console.error);