/**
 * SQLite Storage Adapter for Local Development
 * Provides a simpler database interface for development without PostgreSQL
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';

// Initialize SQLite database
const db = new Database('./local.db');
db.pragma('foreign_keys = ON');

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export class SqliteStorage {
  // ===== USER MANAGEMENT =====
  async getUser(id: string): Promise<any> {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) || undefined;
  }

  async getUserById(id: string): Promise<any> {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<any> {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) || null;
  }

  async createUser(user: any): Promise<any> {
    const id = user.id || crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO users (
        id, email, first_name, last_name, display_name, 
        profile_image_url, created_at, updated_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, 
      user.email, 
      user.firstName || null,
      user.lastName || null,
      user.displayName || null,
      user.profileImageUrl || null,
      now, 
      now, 
      1
    );
    
    // Create default user profile
    const profileStmt = db.prepare(`
      INSERT INTO user_profiles (
        user_id, learning_style, preferred_pace, difficulty_preference,
        current_level, total_xp, streak_count, longest_streak
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    profileStmt.run(
      id, 'mixed', 'medium', 'incremental',
      1, 0, 0, 0
    );
    
    return this.getUserById(id);
  }

  async upsertUser(userData: any): Promise<any> {
    const existing = await this.getUserByEmail(userData.email);
    
    if (existing) {
      // Update existing user
      const stmt = db.prepare(`
        UPDATE users SET 
          first_name = ?, last_name = ?, display_name = ?,
          profile_image_url = ?, updated_at = ?, last_login_at = ?
        WHERE id = ?
      `);
      
      const now = new Date().toISOString();
      stmt.run(
        userData.firstName || existing.first_name,
        userData.lastName || existing.last_name,
        userData.displayName || existing.display_name,
        userData.profileImageUrl || existing.profile_image_url,
        now,
        now,
        existing.id
      );
      
      return this.getUserById(existing.id);
    } else {
      // Create new user
      return this.createUser(userData);
    }
  }

  async updateUserProfile(userId: string, profile: any): Promise<void> {
    const stmt = db.prepare(`
      UPDATE user_profiles SET 
        bio = COALESCE(?, bio),
        learning_style = COALESCE(?, learning_style),
        preferred_pace = COALESCE(?, preferred_pace),
        updated_at = ?
      WHERE user_id = ?
    `);
    
    stmt.run(
      profile.bio,
      profile.learningStyle,
      profile.preferredPace,
      new Date().toISOString(),
      userId
    );
  }

  async getUserProfile(userId: string): Promise<any> {
    const stmt = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?');
    return stmt.get(userId) || null;
  }

  // ===== GOALS MANAGEMENT =====
  async createGoal(goal: any): Promise<any> {
    const id = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO goals (
        id, user_id, title, description, category, 
        status, priority, deadline, progress, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      goal.userId,
      goal.title,
      goal.description || null,
      goal.category || 'personal',
      goal.status || 'active',
      goal.priority || 'medium',
      goal.deadline || null,
      goal.progress || '0',
      now,
      now
    );
    
    return this.getGoalById(id);
  }

  async getUserGoals(userId: string, status?: string): Promise<any[]> {
    let query = 'SELECT * FROM goals WHERE user_id = ?';
    const params: any[] = [userId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  async getGoalById(goalId: string): Promise<any> {
    const stmt = db.prepare('SELECT * FROM goals WHERE id = ?');
    return stmt.get(goalId) || null;
  }

  async updateGoal(goalId: string, updates: any): Promise<void> {
    const fields = [];
    const values = [];
    
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.progress !== undefined) {
      fields.push('progress = ?');
      values.push(updates.progress);
    }
    
    if (fields.length === 0) return;
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(goalId);
    
    const stmt = db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  async deleteGoal(goalId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM goals WHERE id = ?');
    stmt.run(goalId);
  }

  // ===== TASKS MANAGEMENT =====
  async createTask(task: any): Promise<any> {
    const id = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, goal_id, plan_id, title, description,
        status, priority, due_date, estimated_minutes, time_spent,
        is_timer_running, order_index, depth, parent_task_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      task.goalId,
      task.planId || null,
      task.title,
      task.description || null,
      task.status || 'pending',
      task.priority || 'medium',
      task.dueDate || null,
      task.estimatedMinutes || null,
      task.timeSpent || 0,
      task.isTimerRunning || 0,
      task.orderIndex || 0,
      task.depth || 0,
      task.parentTaskId || null,
      now
    );
    
    return this.getTaskById(id);
  }

  async getTaskById(taskId: string): Promise<any> {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(taskId) || null;
  }

  async getUserTasks(userId: string, options?: any): Promise<any[]> {
    // First get user's goal IDs
    const goalsStmt = db.prepare('SELECT id FROM goals WHERE user_id = ?');
    const goals = goalsStmt.all(userId);
    
    if (goals.length === 0) return [];
    
    const goalIds = goals.map(g => g.id);
    const placeholders = goalIds.map(() => '?').join(',');
    
    let query = `SELECT * FROM tasks WHERE goal_id IN (${placeholders})`;
    const params: any[] = [...goalIds];
    
    if (options?.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.priority) {
      query += ' AND priority = ?';
      params.push(options.priority);
    }
    if (options?.goalId) {
      query += ' AND goal_id = ?';
      params.push(options.goalId);
    }
    
    // Add sorting
    if (options?.sortBy === 'title') {
      query += ` ORDER BY title ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    } else if (options?.sortBy === 'priority') {
      query += ` ORDER BY 
        CASE priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
          ELSE 5 
        END ${options.sortOrder === 'desc' ? 'DESC' : 'ASC'}`;
    } else if (options?.sortBy === 'dueDate') {
      query += ` ORDER BY due_date ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
      if (options?.offset) {
        query += ` OFFSET ${options.offset}`;
      }
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  async updateTask(taskId: string, updates: any): Promise<void> {
    const fields = [];
    const values = [];
    
    const updateableFields = [
      'title', 'description', 'status', 'priority', 
      'due_date', 'time_spent', 'is_timer_running',
      'started_at', 'paused_at', 'completed_at'
    ];
    
    for (const field of updateableFields) {
      const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (updates[camelField] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[camelField]);
      }
    }
    
    if (fields.length === 0) return;
    
    values.push(taskId);
    const stmt = db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  async deleteTask(taskId: string): Promise<void> {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(taskId);
  }

  // ===== OAuth & Connected Accounts =====
  async getConnectedAccountByProvider(userId: string, provider: string): Promise<any> {
    const stmt = db.prepare(`
      SELECT * FROM connected_accounts 
      WHERE user_id = ? AND provider = ?
    `);
    return stmt.get(userId, provider) || null;
  }

  async connectAccount(account: any): Promise<any> {
    const id = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO connected_accounts (
        id, user_id, provider, provider_user_id, email,
        display_name, profile_image_url, access_token, refresh_token,
        token_expires_at, connected_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      account.userId,
      account.provider,
      account.providerUserId,
      account.email || null,
      account.displayName || null,
      account.profileImageUrl || null,
      account.accessToken || null,
      account.refreshToken || null,
      account.tokenExpiresAt || null,
      now,
      now
    );
    
    return { id, ...account };
  }

  async getConnectedAccounts(userId: string): Promise<any[]> {
    const stmt = db.prepare('SELECT * FROM connected_accounts WHERE user_id = ?');
    return stmt.all(userId);
  }

  // ===== OAuth State Management =====
  async saveOAuthState(state: string, userId?: string, popup?: boolean): Promise<void> {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    
    const stmt = db.prepare(`
      INSERT INTO oauth_states (state, user_id, popup, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(state, userId || null, popup ? 1 : 0, expiresAt);
  }

  async getOAuthState(state: string): Promise<any> {
    // Clean up expired states
    const cleanupStmt = db.prepare("DELETE FROM oauth_states WHERE expires_at < datetime('now')");
    cleanupStmt.run();
    
    const stmt = db.prepare('SELECT * FROM oauth_states WHERE state = ?');
    const result = stmt.get(state);
    
    if (result) {
      // Delete the state after retrieval (one-time use)
      const deleteStmt = db.prepare('DELETE FROM oauth_states WHERE state = ?');
      deleteStmt.run(state);
      
      return {
        userId: result.user_id,
        popup: result.popup === 1,
      };
    }
    
    return null;
  }

  // ===== Stub methods for compatibility =====
  async updateUserStreaks(userId: string): Promise<void> {
    // Simplified streak update
    const user = await this.getUserById(userId);
    if (!user) return;
    
    const profile = await this.getUserProfile(userId);
    if (!profile) return;
    
    const stmt = db.prepare(`
      UPDATE user_profiles 
      SET streak_count = streak_count + 1, 
          longest_streak = MAX(longest_streak, streak_count + 1)
      WHERE user_id = ?
    `);
    
    stmt.run(userId);
  }

  async getUserAchievements(userId: string): Promise<any[]> {
    const stmt = db.prepare(`
      SELECT ua.*, a.* 
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked_at DESC
    `);
    return stmt.all(userId);
  }

  async addXPTransaction(transaction: any): Promise<void> {
    // Update user profile XP
    const stmt = db.prepare(`
      UPDATE user_profiles 
      SET total_xp = total_xp + ? 
      WHERE user_id = ?
    `);
    stmt.run(transaction.delta || 0, transaction.userId);
  }

  async getUserXP(userId: string): Promise<number> {
    const profile = await this.getUserProfile(userId);
    return profile?.total_xp || 0;
  }

  // Add more stub methods as needed for compatibility
  async createTaskPlan(plan: any): Promise<any> { return plan; }
  async getActiveTaskPlan(goalId: string): Promise<any> { return null; }
  async createTasks(tasks: any[]): Promise<any[]> { 
    return Promise.all(tasks.map(t => this.createTask(t)));
  }
  async getTasksByPlan(planId: string): Promise<any[]> { return []; }
  async recordPerformanceEvent(event: any): Promise<void> { }
  async saveMentorSession(session: any): Promise<void> { }
  async createMentorConversation(conversation: any): Promise<any> { return conversation; }
  async getUserMentorConversations(userId: string): Promise<any[]> { return []; }
  async updateMentorConversation(id: string, updates: any): Promise<void> { }
  async getMentorConversation(id: string): Promise<any> { return null; }
  async getRecentTasks(userId: string, limit: number): Promise<any[]> { 
    return this.getUserTasks(userId, { limit });
  }
}

// Export singleton instance
export const sqliteStorage = new SqliteStorage();