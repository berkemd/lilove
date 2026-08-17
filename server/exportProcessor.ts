import { storage, db } from "./storage";
import { 
  users, userProfiles, goals, tasks, habits, habitCompletions,
  achievements, userAchievements, xpTransactions, coinTransactions,
  friendConnections, teams, teamMembers, challenges, challengeParticipants,
  notifications, mentorConversations, dataExports
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";
// @ts-ignore - json2csv doesn't have type declarations
import { Parser } from "json2csv";
import archiver from "archiver";

// ===== EXPORT PROCESSOR =====
// GDPR-compliant data export system
// Handles async export generation with progress tracking

interface ExportOptions {
  userId: string;
  exportId: string;
  exportType: string;
  format: string;
}

class ExportProcessor {
  private exportsDir: string;

  constructor() {
    this.exportsDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  async processExport(options: ExportOptions): Promise<void> {
    const { userId, exportId, exportType, format } = options;

    try {
      await storage.updateDataExportStatus(exportId, "processing", 0);

      const exportData = await this.collectExportData(userId, exportType);
      await storage.updateDataExportStatus(exportId, "processing", 50);

      const filePath = await this.generateExportFile(exportId, exportData, format, exportType);
      await storage.updateDataExportStatus(exportId, "completed", 100, filePath);

      const fileStats = fs.statSync(filePath);
      await db.update(dataExports)
        .set({ fileSize: fileStats.size, fileName: path.basename(filePath) })
        .where(eq(dataExports.id, exportId));

    } catch (error: any) {
      console.error("Export processing error:", error);
      await storage.updateDataExportStatus(exportId, "failed");
      await db.update(dataExports)
        .set({ errorMessage: error.message || "Unknown error occurred" })
        .where(eq(dataExports.id, exportId));
    }
  }

  private async collectExportData(userId: string, exportType: string): Promise<any> {
    const exportData: any = {
      exportDate: new Date().toISOString(),
      userId,
      exportType
    };

    if (exportType === "full" || exportType === "profile") {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
      
      exportData.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        phoneNumber: user.phoneNumber,
        website: user.website,
        location: user.location,
        company: user.company,
        jobTitle: user.jobTitle,
        socialLinks: user.socialLinks,
        timezone: user.timezone,
        theme: user.theme,
        language: user.language,
        profileVisibility: user.profileVisibility,
        createdAt: user.createdAt
      };

      if (profile) {
        exportData.profile = {
          learningStyle: profile.learningStyle,
          preferredPace: profile.preferredPace,
          difficultyPreference: profile.difficultyPreference,
          goalCategories: profile.goalCategories,
          dailyTimeCommitment: profile.dailyTimeCommitment,
          preferredCoachingStyle: profile.preferredCoachingStyle
        };
      }

      exportData.settings = {
        notificationsEnabled: user.notificationsEnabled,
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
        motivationalQuotes: user.motivationalQuotes,
        celebrationsEnabled: user.celebrationsEnabled,
        dataSharing: user.dataSharing,
        analyticsOptOut: user.analyticsOptOut
      };

      const userStats = await storage.getUserPerformanceMetrics(userId);
      exportData.statistics = userStats;
    }

    if (exportType === "full" || exportType === "goals") {
      const userGoals = await db.select().from(goals).where(eq(goals.userId, userId));
      exportData.goals = userGoals.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        difficultyLevel: g.difficultyLevel,
        status: g.status,
        progress: g.progress,
        targetDate: g.currentETA,
        createdAt: g.createdAt,
        completedAt: g.completedAt
      }));
    }

    if (exportType === "full" || exportType === "tasks") {
      const userTasks = await storage.getUserTasks(userId, { limit: 10000 });
      exportData.tasks = userTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        estimatedDuration: t.estimatedDuration,
        timeSpent: t.timeSpent,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        createdAt: t.createdAt
      }));
    }

    if (exportType === "full" || exportType === "habits") {
      const userHabits = await db.select().from(habits).where(eq(habits.userId, userId));
      exportData.habits = userHabits.map(h => ({
        id: h.id,
        title: h.title,
        description: h.description,
        frequency: h.frequency,
        targetCount: h.targetCount,
        currentStreak: h.currentStreak,
        longestStreak: h.longestStreak,
        createdAt: h.createdAt
      }));

      const habitIds = userHabits.map(h => h.id);
      if (habitIds.length > 0) {
        const completions = await db.select().from(habitCompletions)
          .where(eq(habitCompletions.userId, userId));
        exportData.habitCompletions = completions;
      }
    }

    if (exportType === "full" || exportType === "achievements") {
      const userAchievementRecords = await storage.getUserAchievements(userId);
      exportData.achievements = userAchievementRecords.map(ua => ({
        achievementId: ua.achievementId,
        unlockedAt: ua.unlockedAt,
        progress: ua.progress
      }));
    }

    if (exportType === "full" || exportType === "social") {
      const friends = await db.select().from(friendConnections)
        .where(eq(friendConnections.userId, userId));
      exportData.friends = friends;

      const userTeamMembers = await db.select().from(teamMembers)
        .where(eq(teamMembers.userId, userId));
      exportData.teams = userTeamMembers;

      const userChallenges = await db.select().from(challengeParticipants)
        .where(eq(challengeParticipants.userId, userId));
      exportData.challenges = userChallenges;
    }

    if (exportType === "full") {
      const userNotifications = await db.select().from(notifications)
        .where(eq(notifications.userId, userId));
      exportData.notifications = userNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt
      }));

      const xpHistory = await storage.getXPTransactionHistory(userId, 1000);
      exportData.transactions = {
        xp: xpHistory,
        coins: await db.select().from(coinTransactions).where(eq(coinTransactions.userId, userId))
      };

      const conversations = await storage.getUserMentorConversations(userId);
      exportData.chatHistory = conversations;
    }

    return exportData;
  }

  private async generateExportFile(
    exportId: string,
    data: any,
    format: string,
    exportType: string
  ): Promise<string> {
    if (format === "json") {
      return this.generateJSONFile(exportId, data);
    } else if (format === "csv") {
      return this.generateCSVZip(exportId, data, exportType);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async generateJSONFile(exportId: string, data: any): Promise<string> {
    const fileName = `export_${exportId}.json`;
    const filePath = path.join(this.exportsDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    
    return filePath;
  }

  private async generateCSVZip(exportId: string, data: any, exportType: string): Promise<string> {
    const zipFileName = `export_${exportId}.zip`;
    const zipFilePath = path.join(this.exportsDir, zipFileName);
    
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.pipe(output);

    const csvFiles: { name: string; data: any[] }[] = [];

    if (data.user) {
      csvFiles.push({ name: "user.csv", data: [data.user] });
    }

    if (data.profile) {
      csvFiles.push({ name: "profile.csv", data: [data.profile] });
    }

    if (data.settings) {
      csvFiles.push({ name: "settings.csv", data: [data.settings] });
    }

    if (data.goals && data.goals.length > 0) {
      csvFiles.push({ name: "goals.csv", data: data.goals });
    }

    if (data.tasks && data.tasks.length > 0) {
      csvFiles.push({ name: "tasks.csv", data: data.tasks });
    }

    if (data.habits && data.habits.length > 0) {
      csvFiles.push({ name: "habits.csv", data: data.habits });
    }

    if (data.habitCompletions && data.habitCompletions.length > 0) {
      csvFiles.push({ name: "habit_completions.csv", data: data.habitCompletions });
    }

    if (data.achievements && data.achievements.length > 0) {
      csvFiles.push({ name: "achievements.csv", data: data.achievements });
    }

    if (data.friends && data.friends.length > 0) {
      csvFiles.push({ name: "friends.csv", data: data.friends });
    }

    if (data.teams && data.teams.length > 0) {
      csvFiles.push({ name: "teams.csv", data: data.teams });
    }

    if (data.notifications && data.notifications.length > 0) {
      csvFiles.push({ name: "notifications.csv", data: data.notifications });
    }

    if (data.transactions?.xp && data.transactions.xp.length > 0) {
      csvFiles.push({ name: "xp_transactions.csv", data: data.transactions.xp });
    }

    if (data.transactions?.coins && data.transactions.coins.length > 0) {
      csvFiles.push({ name: "coin_transactions.csv", data: data.transactions.coins });
    }

    for (const file of csvFiles) {
      const csv = this.convertToCSV(file.data);
      archive.append(csv, { name: file.name });
    }

    await archive.finalize();

    return new Promise((resolve, reject) => {
      output.on("close", () => resolve(zipFilePath));
      output.on("error", reject);
      archive.on("error", reject);
    });
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return "";

    try {
      const parser = new Parser({
        fields: Object.keys(data[0]),
        withBOM: true
      });
      return parser.parse(data);
    } catch (error) {
      console.error("CSV conversion error:", error);
      return "";
    }
  }

  async cleanupOldExports(): Promise<void> {
    try {
      const files = fs.readdirSync(this.exportsDir);
      const now = Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.exportsDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > sevenDaysInMs) {
          fs.unlinkSync(filePath);
          console.log(`Deleted expired export: ${file}`);
        }
      }

      await storage.cleanupExpiredExports();
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
}

export const exportProcessor = new ExportProcessor();

setInterval(() => {
  exportProcessor.cleanupOldExports();
}, 24 * 60 * 60 * 1000);
