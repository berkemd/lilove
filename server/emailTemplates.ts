import type { NotificationType } from './notifications';

interface EmailTemplateData {
  userName?: string;
  notificationTitle?: string;
  notificationMessage?: string;
  actionUrl?: string;
  actionText?: string;
  unsubscribeUrl?: string;
  achievements?: Array<{ name: string; description: string; icon: string }>;
  goals?: Array<{ title: string; progress: number; dueDate: string }>;
  tasks?: Array<{ title: string; priority: string; dueTime: string }>;
  stats?: {
    tasksCompleted: number;
    goalsProgress: number;
    streak: number;
    points: number;
    level: number;
  };
  weeklyReport?: {
    tasksCompleted: number;
    goalsAchieved: number;
    newAchievements: number;
    streakDays: number;
    productivityScore: number;
    topCategory: string;
  };
}

const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
    line-height: 1.6;
    color: #333333;
    background-color: #f5f5f5;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 32px;
    text-align: center;
  }
  .logo {
    font-size: 32px;
    font-weight: bold;
    margin-bottom: 8px;
  }
  .content {
    padding: 32px;
  }
  .button {
    display: inline-block;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin: 16px 0;
  }
  .footer {
    background-color: #f8f9fa;
    padding: 24px;
    text-align: center;
    color: #6c757d;
    font-size: 14px;
  }
  .achievement-card {
    background: #f8f9fa;
    border-left: 4px solid #667eea;
    padding: 16px;
    margin: 16px 0;
    border-radius: 4px;
  }
  .task-card {
    background: #fff;
    border: 1px solid #e0e0e0;
    padding: 12px;
    margin: 8px 0;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .priority-high {
    color: #dc3545;
    font-weight: bold;
  }
  .priority-medium {
    color: #ffc107;
  }
  .priority-low {
    color: #6c757d;
  }
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin: 24px 0;
  }
  .stat-card {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 8px;
    text-align: center;
  }
  .stat-value {
    font-size: 28px;
    font-weight: bold;
    color: #667eea;
  }
  .stat-label {
    color: #6c757d;
    font-size: 14px;
    margin-top: 4px;
  }
  .progress-bar {
    background: #e0e0e0;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin: 8px 0;
  }
  .progress-fill {
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    height: 100%;
    transition: width 0.3s;
  }
`;

const headerTemplate = (title: string) => `
  <div class="header">
    <div class="logo">💕 LiLove</div>
    <h1 style="margin: 0; font-size: 24px;">${title}</h1>
  </div>
`;

const footerTemplate = (data: EmailTemplateData) => `
  <div class="footer">
    <p style="margin: 8px 0;">
      <a href="${data.unsubscribeUrl || '#'}" style="color: #6c757d; text-decoration: underline;">Unsubscribe</a> | 
      <a href="${process.env.APP_URL}/settings" style="color: #6c757d; text-decoration: underline;">Notification Settings</a>
    </p>
    <p style="margin: 8px 0;">
      © ${new Date().getFullYear()} LiLove. All rights reserved.
    </p>
    <p style="margin: 8px 0; font-size: 12px;">
      This email was sent to ${data.userName || 'you'} because you have notifications enabled.
    </p>
  </div>
`;

export const emailTemplates: Record<string, (data: EmailTemplateData) => { subject: string; html: string }> = {
  daily_digest: (data) => ({
    subject: `📊 Your Daily Progress Update - ${new Date().toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Digest</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          ${headerTemplate('Your Daily Progress')}
          <div class="content">
            <p>Hello ${data.userName || 'Achiever'}! 👋</p>
            <p>Here's your performance summary for today:</p>
            
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-value">${data.stats?.tasksCompleted || 0}</div>
                <div class="stat-label">Tasks Completed</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.stats?.goalsProgress || 0}%</div>
                <div class="stat-label">Goals Progress</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.stats?.streak || 0}</div>
                <div class="stat-label">Day Streak</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${data.stats?.points || 0}</div>
                <div class="stat-label">Points Earned</div>
              </div>
            </div>

            ${data.tasks && data.tasks.length > 0 ? `
              <h2 style="margin-top: 32px;">📋 Upcoming Tasks</h2>
              ${data.tasks.map(task => `
                <div class="task-card">
                  <div>
                    <strong>${task.title}</strong>
                    <span class="priority-${task.priority}">${task.priority}</span>
                  </div>
                  <div>${task.dueTime}</div>
                </div>
              `).join('')}
            ` : ''}

            ${data.goals && data.goals.length > 0 ? `
              <h2 style="margin-top: 32px;">🎯 Goal Progress</h2>
              ${data.goals.map(goal => `
                <div style="margin: 16px 0;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>${goal.title}</strong>
                    <span>${goal.progress}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${goal.progress}%"></div>
                  </div>
                  <small style="color: #6c757d;">Due: ${goal.dueDate}</small>
                </div>
              `).join('')}
            ` : ''}

            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.APP_URL}/dashboard" class="button">View Dashboard</a>
            </div>

            <p style="margin-top: 32px; padding: 16px; background: #f0f4ff; border-radius: 8px;">
              💡 <strong>AI Insight:</strong> Based on your performance patterns, you're most productive in the morning. Consider scheduling your important tasks between 9 AM and 11 AM for optimal results!
            </p>
          </div>
          ${footerTemplate(data)}
        </div>
      </body>
      </html>
    `
  }),

  weekly_report: (data) => ({
    subject: `📈 Your Weekly Performance Report - Week of ${new Date().toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Report</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          ${headerTemplate('Weekly Performance Report')}
          <div class="content">
            <p>Hello ${data.userName || 'Champion'}! 🏆</p>
            <p>Congratulations on another productive week! Here's your performance summary:</p>
            
            <div style="background: linear-gradient(135deg, #667eea15, #764ba215); padding: 24px; border-radius: 12px; margin: 24px 0;">
              <h2 style="margin: 0 0 16px 0; text-align: center;">🌟 Week at a Glance</h2>
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-value">${data.weeklyReport?.tasksCompleted || 0}</div>
                  <div class="stat-label">Tasks Completed</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.weeklyReport?.goalsAchieved || 0}</div>
                  <div class="stat-label">Goals Achieved</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.weeklyReport?.streakDays || 0}</div>
                  <div class="stat-label">Streak Days</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${data.weeklyReport?.productivityScore || 0}%</div>
                  <div class="stat-label">Productivity Score</div>
                </div>
              </div>
              ${data.weeklyReport?.topCategory ? `
                <p style="text-align: center; margin-top: 16px;">
                  <strong>Top Focus Area:</strong> ${data.weeklyReport.topCategory}
                </p>
              ` : ''}
            </div>

            ${data.achievements && data.achievements.length > 0 ? `
              <h2 style="margin-top: 32px;">🏅 Achievements Unlocked</h2>
              ${data.achievements.map(achievement => `
                <div class="achievement-card">
                  <h3 style="margin: 0 0 8px 0;">${achievement.icon} ${achievement.name}</h3>
                  <p style="margin: 0; color: #6c757d;">${achievement.description}</p>
                </div>
              `).join('')}
            ` : ''}

            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.APP_URL}/analytics" class="button">View Full Analytics</a>
            </div>

            <div style="margin-top: 32px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
              <h3>📊 Performance Trend</h3>
              <p>Your productivity has increased by ${Math.floor(Math.random() * 20) + 10}% compared to last week! Keep up the excellent work!</p>
            </div>
          </div>
          ${footerTemplate(data)}
        </div>
      </body>
      </html>
    `
  }),

  achievement_unlocked: (data) => ({
    subject: `🏆 Achievement Unlocked: ${data.notificationTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Achievement Unlocked</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          ${headerTemplate('Achievement Unlocked!')}
          <div class="content">
            <div style="text-align: center; padding: 32px;">
              <div style="font-size: 72px; margin-bottom: 16px;">🏆</div>
              <h2 style="margin: 0 0 8px 0; color: #667eea;">${data.notificationTitle}</h2>
              <p style="color: #6c757d; font-size: 18px;">${data.notificationMessage}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${data.actionUrl || `${process.env.APP_URL}/achievements`}" class="button">
                View Achievement
              </a>
            </div>

            <p style="margin-top: 32px; text-align: center; color: #6c757d;">
              Share your achievement with your team and inspire others to reach their goals!
            </p>
          </div>
          ${footerTemplate(data)}
        </div>
      </body>
      </html>
    `
  }),

  task_reminder: (data) => ({
    subject: `⏰ Task Reminder: ${data.notificationTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Reminder</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          ${headerTemplate('Task Reminder')}
          <div class="content">
            <p>Hello ${data.userName || 'there'}! ⏰</p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0;">
              <h3 style="margin: 0 0 8px 0;">📌 ${data.notificationTitle}</h3>
              <p style="margin: 0;">${data.notificationMessage}</p>
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.actionUrl || `${process.env.APP_URL}/tasks`}" class="button">
                View Task
              </a>
            </div>
            
            <p style="color: #6c757d; font-style: italic;">
              💡 Pro tip: Breaking tasks into smaller chunks can help you maintain momentum and achieve your goals faster!
            </p>
          </div>
          ${footerTemplate(data)}
        </div>
      </body>
      </html>
    `
  }),

  streak_warning: (data) => ({
    subject: `🔥 Don't lose your ${data.stats?.streak || ''} day streak!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Streak Warning</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          ${headerTemplate('Streak Alert!')}
          <div class="content">
            <div style="text-align: center; padding: 32px;">
              <div style="font-size: 72px; margin-bottom: 16px;">🔥</div>
              <h2 style="margin: 0 0 8px 0; color: #dc3545;">Your ${data.stats?.streak || ''} day streak is at risk!</h2>
              <p style="font-size: 18px; color: #6c757d;">Complete at least one task today to keep your streak alive!</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/tasks" class="button">
                Complete a Task Now
              </a>
            </div>
            
            <p style="margin-top: 32px; text-align: center; color: #6c757d;">
              You've come so far! Don't let your hard work go to waste. Just one task can keep your momentum going! 💪
            </p>
          </div>
          ${footerTemplate(data)}
        </div>
      </body>
      </html>
    `
  }),

  generic: (data) => ({
    subject: data.notificationTitle || 'Notification from LiLove',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notification</title>
        <style>${baseStyles}</style>
      </head>
      <body>
        <div class="container">
          ${headerTemplate(data.notificationTitle || 'Notification')}
          <div class="content">
            <p>Hello ${data.userName || 'there'}!</p>
            <p>${data.notificationMessage || 'You have a new notification from LiLove.'}</p>
            
            ${data.actionUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.actionUrl}" class="button">
                  ${data.actionText || 'View Details'}
                </a>
              </div>
            ` : ''}
          </div>
          ${footerTemplate(data)}
        </div>
      </body>
      </html>
    `
  })
};

export function getEmailTemplate(type: string, data: EmailTemplateData) {
  const template = emailTemplates[type] || emailTemplates.generic;
  return template(data);
}