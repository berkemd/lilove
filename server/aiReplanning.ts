import OpenAI from "openai";
import { storage, db } from "./storage";
import { 
  goals, tasks, habits, habitCompletions, userProfiles, mentorConversations,
  aiReplanningLogs, usageStatistics, performanceEvents
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, count, avg } from "drizzle-orm";
import { aiCache } from "./cache/aiCache";
import { subDays, differenceInDays, format, startOfDay, endOfDay } from "date-fns";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const AI_MODEL = "gpt-4o-mini";

export interface FoggAnalysis {
  motivation: { score: number; factors: string[] };
  ability: { score: number; blockers: string[] };
  prompt: { timing: string; message: string };
  behaviorProbability: number;
}

export interface ReplanningRecommendation {
  id: string;
  type: 'reschedule' | 'simplify' | 'break_down' | 'motivate' | 'pause';
  priority: 'high' | 'medium' | 'low';
  targetId: string;
  targetType: 'goal' | 'task' | 'habit';
  suggestion: string;
  reasoning: string;
  foggAnalysis: FoggAnalysis;
  proposedChanges?: any;
  createdAt: Date;
  status: string;
}

export interface GoalAnalysis {
  goalId: string;
  goalTitle: string;
  healthScore: number;
  bottlenecks: string[];
  foggAnalysis: FoggAnalysis;
  recommendations: ReplanningRecommendation[];
  predictedCompletion: {
    probability: number;
    estimatedDate: string | null;
    confidence: number;
  };
}

export interface DailySummary {
  date: string;
  overallProgress: number;
  motivationScore: number;
  abilityScore: number;
  completedTasks: number;
  pendingTasks: number;
  activeGoals: number;
  currentStreak: number;
  tips: string[];
  nudge: string;
  priorityActions: string[];
}

class AIReplanningEngine {
  private isConfigured(): boolean {
    return !!(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
  }

  async analyzeGoalProgress(userId: string, goalId: string): Promise<GoalAnalysis> {
    const goal = await storage.getGoalById(goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or access denied");
    }

    const [goalTasks, profile, habits_list, recentEvents] = await Promise.all([
      storage.getTasksByGoal(goalId),
      storage.getUserProfile(userId),
      storage.getUserHabits(userId),
      this.getRecentPerformanceEvents(userId, 30)
    ]);

    const foggAnalysis = await this.calculateFoggModel(userId, goalId, goalTasks, profile, habits_list);
    const bottlenecks = this.identifyBottlenecks(goal, goalTasks, foggAnalysis);
    const healthScore = this.calculateGoalHealth(goal, goalTasks, foggAnalysis);
    const predictedCompletion = await this.predictCompletionProbability(userId, goalId);

    const recommendations = await this.generateRecommendationsForGoal(
      userId, goal, goalTasks, foggAnalysis, bottlenecks
    );

    return {
      goalId: goal.id,
      goalTitle: goal.title,
      healthScore,
      bottlenecks,
      foggAnalysis,
      recommendations,
      predictedCompletion
    };
  }

  async calculateFoggModel(
    userId: string, 
    goalId: string,
    goalTasks: any[],
    profile: any,
    habits_list: any[]
  ): Promise<FoggAnalysis> {
    const completedTasks = goalTasks.filter(t => t.status === 'completed');
    const pendingTasks = goalTasks.filter(t => t.status === 'pending' || t.status === 'active');
    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

    const completionRate = goalTasks.length > 0 
      ? (completedTasks.length / goalTasks.length) * 100 
      : 0;

    const streakCount = profile?.streakCount || 0;
    const habitCompletionRate = await this.getHabitCompletionRate(userId, 7);

    const motivationFactors: string[] = [];
    let motivationScore = 50;

    if (completionRate > 70) {
      motivationScore += 20;
      motivationFactors.push("High task completion rate");
    } else if (completionRate < 30) {
      motivationScore -= 15;
      motivationFactors.push("Low task completion rate - may need encouragement");
    }

    if (streakCount > 7) {
      motivationScore += 15;
      motivationFactors.push(`Strong ${streakCount}-day streak`);
    } else if (streakCount < 3) {
      motivationScore -= 10;
      motivationFactors.push("Streak needs rebuilding");
    }

    if (habitCompletionRate > 70) {
      motivationScore += 10;
      motivationFactors.push("Consistent habit performance");
    }

    motivationScore = Math.max(0, Math.min(100, motivationScore));

    const abilityBlockers: string[] = [];
    let abilityScore = 50;

    const avgTaskDifficulty = pendingTasks.reduce((acc, t) => acc + (t.difficultyRating || 5), 0) / 
      (pendingTasks.length || 1);
    
    const userLevel = profile?.currentLevel || 1;
    const skillGap = avgTaskDifficulty - (userLevel * 1.5);

    if (skillGap > 3) {
      abilityScore -= 25;
      abilityBlockers.push("Tasks may be too difficult for current skill level");
    } else if (skillGap < -2) {
      abilityScore += 15;
      abilityBlockers.push("Tasks well within ability - consider increasing challenge");
    }

    if (overdueTasks.length > 3) {
      abilityScore -= 20;
      abilityBlockers.push(`${overdueTasks.length} overdue tasks creating backlog`);
    }

    const dailyCommitment = profile?.dailyTimeCommitment || 30;
    const totalPendingMinutes = pendingTasks.reduce((acc, t) => acc + (t.estimatedDuration || 30), 0);
    const daysNeeded = totalPendingMinutes / dailyCommitment;

    if (daysNeeded > 30) {
      abilityScore -= 15;
      abilityBlockers.push("Current workload exceeds available time commitment");
    }

    abilityScore = Math.max(0, Math.min(100, abilityScore));

    const promptTiming = this.determineOptimalPromptTiming(profile, habits_list);
    const promptMessage = await this.generateContextualNudge(userId, goalId, motivationScore, abilityScore);

    const behaviorProbability = (motivationScore * abilityScore) / 100;

    return {
      motivation: { score: motivationScore, factors: motivationFactors },
      ability: { score: abilityScore, blockers: abilityBlockers },
      prompt: { timing: promptTiming, message: promptMessage },
      behaviorProbability
    };
  }

  private async getHabitCompletionRate(userId: string, days: number): Promise<number> {
    const startDate = subDays(new Date(), days);
    
    try {
      const completions = await db.select({
        count: count()
      }).from(habitCompletions)
        .innerJoin(habits, eq(habitCompletions.habitId, habits.id))
        .where(and(
          eq(habits.userId, userId),
          gte(habitCompletions.completedAt, startDate)
        ));

      const userHabits = await storage.getUserHabits(userId);
      const activeHabits = userHabits.filter(h => h.isActive && !h.isPaused);
      
      if (activeHabits.length === 0) return 0;
      
      const expectedCompletions = activeHabits.length * days;
      const actualCompletions = completions[0]?.count || 0;
      
      return Math.min(100, (Number(actualCompletions) / expectedCompletions) * 100);
    } catch (error) {
      return 50;
    }
  }

  private async getRecentPerformanceEvents(userId: string, days: number): Promise<any[]> {
    const startDate = subDays(new Date(), days);
    
    try {
      const events = await db.select()
        .from(performanceEvents)
        .where(and(
          eq(performanceEvents.userId, userId),
          gte(performanceEvents.timestamp, startDate)
        ))
        .orderBy(desc(performanceEvents.timestamp))
        .limit(100);
      
      return events;
    } catch (error) {
      return [];
    }
  }

  private identifyBottlenecks(goal: any, tasks: any[], foggAnalysis: FoggAnalysis): string[] {
    const bottlenecks: string[] = [];

    if (foggAnalysis.motivation.score < 40) {
      bottlenecks.push("Low motivation detected - consider breaking goals into smaller wins");
    }

    if (foggAnalysis.ability.score < 40) {
      bottlenecks.push("Ability constraints identified - tasks may need simplification");
    }

    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      bottlenecks.push(`${blockedTasks.length} blocked task(s) need attention`);
    }

    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed');
    if (overdueTasks.length > 2) {
      bottlenecks.push("Multiple overdue tasks creating momentum loss");
    }

    const stagnantDays = goal.updatedAt ? differenceInDays(new Date(), new Date(goal.updatedAt)) : 0;
    if (stagnantDays > 7) {
      bottlenecks.push(`No progress in ${stagnantDays} days - consider re-engagement strategy`);
    }

    return bottlenecks;
  }

  private calculateGoalHealth(goal: any, tasks: any[], foggAnalysis: FoggAnalysis): number {
    let health = 50;

    const progress = Number(goal.progress) || 0;
    health += (progress / 100) * 20;

    health += (foggAnalysis.behaviorProbability / 100) * 20;

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    if (totalTasks > 0) {
      health += (completedTasks / totalTasks) * 10;
    }

    if (goal.currentETA && new Date(goal.currentETA) < new Date()) {
      health -= 15;
    }

    return Math.max(0, Math.min(100, Math.round(health)));
  }

  private determineOptimalPromptTiming(profile: any, habits: any[]): string {
    const workingHours = profile?.workingHours;
    
    if (workingHours?.start) {
      return `${workingHours.start} - Start of work session`;
    }

    const habitWithReminder = habits.find(h => h.reminderEnabled && h.reminderTime);
    if (habitWithReminder) {
      return `${habitWithReminder.reminderTime} - Aligned with habit routine`;
    }

    return "9:00 AM - Morning motivation boost";
  }

  private async generateContextualNudge(
    userId: string, 
    goalId: string, 
    motivationScore: number, 
    abilityScore: number
  ): Promise<string> {
    if (!this.isConfigured()) {
      if (motivationScore < 40) {
        return "Every step forward counts. What's one small thing you can do right now?";
      } else if (abilityScore < 40) {
        return "Complex tasks become simple when broken into pieces. Start with what's easiest.";
      }
      return "You're making progress! Keep the momentum going.";
    }

    const cacheKey = `nudge-${userId}-${goalId}-${Math.floor(motivationScore/20)}-${Math.floor(abilityScore/20)}`;
    const cached = aiCache.get(userId, cacheKey, AI_MODEL);
    if (cached) return cached;

    try {
      const goal = await storage.getGoalById(goalId);
      
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a supportive AI coach. Generate a brief, personalized motivational nudge (1-2 sentences max) based on the user's current state. Be warm but concise.`
          },
          {
            role: "user",
            content: `Goal: ${goal?.title || 'Personal goal'}
Motivation Score: ${motivationScore}/100
Ability Score: ${abilityScore}/100

Generate an encouraging nudge that addresses their current state.`
          }
        ],
        max_tokens: 100
      });

      const nudge = completion.choices[0]?.message?.content || "Keep going - you're doing great!";
      aiCache.set(userId, cacheKey, AI_MODEL, nudge);
      return nudge;
    } catch (error) {
      console.error("Error generating nudge:", error);
      return "Keep making progress, one step at a time!";
    }
  }

  async generateRescheduleRecommendations(userId: string): Promise<ReplanningRecommendation[]> {
    const userGoals = await storage.getUserGoals(userId, 'active');
    const recommendations: ReplanningRecommendation[] = [];

    for (const goal of userGoals.slice(0, 5)) {
      const goalTasks = await storage.getTasksByGoal(goal.id);
      const overdueTasks = goalTasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) < new Date() && 
        t.status !== 'completed'
      );

      for (const task of overdueTasks) {
        const profile = await storage.getUserProfile(userId);
        const foggAnalysis = await this.calculateFoggModel(userId, goal.id, goalTasks, profile, []);
        
        const daysPastDue = differenceInDays(new Date(), new Date(task.dueDate!));
        const priority = daysPastDue > 7 ? 'high' : daysPastDue > 3 ? 'medium' : 'low';
        
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + Math.min(daysPastDue, 7) + 3);

        const recommendation: ReplanningRecommendation = {
          id: `rec-${task.id}-${Date.now()}`,
          type: 'reschedule',
          priority,
          targetId: task.id,
          targetType: 'task',
          suggestion: `Reschedule "${task.title}" to ${format(newDueDate, 'MMM dd, yyyy')}`,
          reasoning: `Task is ${daysPastDue} days overdue. Rescheduling provides a fresh start and reduces guilt-based procrastination.`,
          foggAnalysis,
          proposedChanges: {
            dueDate: newDueDate.toISOString(),
            originalDueDate: task.dueDate
          },
          createdAt: new Date(),
          status: 'pending'
        };

        recommendations.push(recommendation);

        await this.saveRecommendation(userId, recommendation);
      }
    }

    return recommendations;
  }

  async adaptGoalDifficulty(userId: string, goalId: string): Promise<ReplanningRecommendation[]> {
    const goal = await storage.getGoalById(goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or access denied");
    }

    const [goalTasks, profile] = await Promise.all([
      storage.getTasksByGoal(goalId),
      storage.getUserProfile(userId)
    ]);

    const foggAnalysis = await this.calculateFoggModel(userId, goalId, goalTasks, profile, []);
    const recommendations: ReplanningRecommendation[] = [];

    if (foggAnalysis.ability.score < 40) {
      const complexTasks = goalTasks.filter(t => 
        (t.difficultyRating || 5) > 7 && t.status !== 'completed'
      );

      for (const task of complexTasks.slice(0, 3)) {
        const recommendation: ReplanningRecommendation = {
          id: `rec-simplify-${task.id}-${Date.now()}`,
          type: 'simplify',
          priority: 'high',
          targetId: task.id,
          targetType: 'task',
          suggestion: `Simplify "${task.title}" by reducing scope or breaking into smaller steps`,
          reasoning: `Current difficulty rating (${task.difficultyRating}/10) exceeds comfortable ability level. Simplification increases success probability.`,
          foggAnalysis,
          proposedChanges: {
            suggestedDifficulty: Math.max(1, (task.difficultyRating || 5) - 2),
            originalDifficulty: task.difficultyRating
          },
          createdAt: new Date(),
          status: 'pending'
        };

        recommendations.push(recommendation);
        await this.saveRecommendation(userId, recommendation);
      }
    }

    if (foggAnalysis.motivation.score < 40 && goalTasks.length > 5) {
      const recommendation: ReplanningRecommendation = {
        id: `rec-breakdown-${goalId}-${Date.now()}`,
        type: 'break_down',
        priority: 'high',
        targetId: goalId,
        targetType: 'goal',
        suggestion: `Break "${goal.title}" into smaller sub-goals with quick wins`,
        reasoning: `Low motivation detected. Creating visible progress through smaller milestones can rebuild momentum.`,
        foggAnalysis,
        proposedChanges: {
          suggestedMilestones: [
            { name: "Quick Win Milestone", progress: 25 },
            { name: "Momentum Builder", progress: 50 },
            { name: "Home Stretch", progress: 75 }
          ]
        },
        createdAt: new Date(),
        status: 'pending'
      };

      recommendations.push(recommendation);
      await this.saveRecommendation(userId, recommendation);
    }

    return recommendations;
  }

  async createMotivationalNudge(userId: string): Promise<ReplanningRecommendation | null> {
    const profile = await storage.getUserProfile(userId);
    const activeGoals = await storage.getUserGoals(userId, 'active');
    
    if (activeGoals.length === 0) return null;

    const mostRecentGoal = activeGoals[0];
    const goalTasks = await storage.getTasksByGoal(mostRecentGoal.id);
    const foggAnalysis = await this.calculateFoggModel(userId, mostRecentGoal.id, goalTasks, profile, []);

    let nudgeMessage: string;
    let priority: 'high' | 'medium' | 'low' = 'medium';

    if (foggAnalysis.motivation.score < 30) {
      priority = 'high';
      nudgeMessage = await this.generateAINudge(userId, 'low_motivation', foggAnalysis);
    } else if ((profile?.streakCount || 0) > 0 && (profile?.streakCount || 0) % 7 === 0) {
      nudgeMessage = await this.generateAINudge(userId, 'streak_milestone', foggAnalysis);
    } else {
      nudgeMessage = await this.generateAINudge(userId, 'general_encouragement', foggAnalysis);
    }

    const recommendation: ReplanningRecommendation = {
      id: `nudge-${userId}-${Date.now()}`,
      type: 'motivate',
      priority,
      targetId: userId,
      targetType: 'goal',
      suggestion: nudgeMessage,
      reasoning: `Based on current motivation score (${foggAnalysis.motivation.score}/100) and behavioral patterns.`,
      foggAnalysis,
      createdAt: new Date(),
      status: 'pending'
    };

    await this.saveRecommendation(userId, recommendation);
    return recommendation;
  }

  private async generateAINudge(userId: string, nudgeType: string, foggAnalysis: FoggAnalysis): Promise<string> {
    if (!this.isConfigured()) {
      const fallbacks: Record<string, string> = {
        low_motivation: "Every journey has tough moments. What's the smallest step you could take right now?",
        streak_milestone: "Amazing streak! You're building something powerful. Keep it going!",
        general_encouragement: "You're making progress every day. Stay consistent and trust the process."
      };
      return fallbacks[nudgeType] || fallbacks.general_encouragement;
    }

    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a warm, encouraging AI coach. Generate personalized motivational messages.
Be genuine and specific. Keep messages under 2 sentences. Avoid clichés.`
          },
          {
            role: "user",
            content: `Generate a ${nudgeType.replace('_', ' ')} message.
Motivation Score: ${foggAnalysis.motivation.score}/100
Key Factors: ${foggAnalysis.motivation.factors.join(', ')}
Behavior Probability: ${foggAnalysis.behaviorProbability}%`
          }
        ],
        max_tokens: 100
      });

      return completion.choices[0]?.message?.content || "Keep going - you're doing great!";
    } catch (error) {
      console.error("Error generating AI nudge:", error);
      return "Every step forward is progress. You've got this!";
    }
  }

  async predictCompletionProbability(userId: string, goalId: string): Promise<{
    probability: number;
    estimatedDate: string | null;
    confidence: number;
  }> {
    const goal = await storage.getGoalById(goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or access denied");
    }

    const [goalTasks, profile, performanceMetrics] = await Promise.all([
      storage.getTasksByGoal(goalId),
      storage.getUserProfile(userId),
      storage.getUserPerformanceMetrics(userId)
    ]);

    const completedTasks = goalTasks.filter(t => t.status === 'completed');
    const completionRate = goalTasks.length > 0 
      ? completedTasks.length / goalTasks.length 
      : 0;

    const progress = Number(goal.progress) || 0;

    const streakFactor = Math.min(1, ((profile?.streakCount || 0) / 30) * 0.3 + 0.7);
    const consistencyFactor = Number(profile?.consistencyRating || 50) / 100;
    const historicalSuccess = (performanceMetrics?.successRate || 50) / 100;

    let probability = (
      completionRate * 0.3 +
      (progress / 100) * 0.25 +
      streakFactor * 0.2 +
      consistencyFactor * 0.15 +
      historicalSuccess * 0.1
    ) * 100;

    probability = Math.max(5, Math.min(95, probability));

    let estimatedDate: string | null = null;
    const remainingTasks = goalTasks.length - completedTasks.length;
    
    if (remainingTasks > 0) {
      const avgTasksPerDay = Math.max(0.5, completedTasks.length / 
        Math.max(1, differenceInDays(new Date(), new Date(goal.createdAt || new Date()))));
      
      const daysNeeded = Math.ceil(remainingTasks / avgTasksPerDay);
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + daysNeeded);
      estimatedDate = format(estimatedCompletion, 'yyyy-MM-dd');
    } else if (goal.status === 'completed') {
      probability = 100;
    }

    const dataPoints = [completedTasks.length, profile?.streakCount || 0, goalTasks.length];
    const hasEnoughData = dataPoints.some(d => d > 5);
    const confidence = hasEnoughData ? Math.min(90, 50 + (dataPoints.reduce((a, b) => a + b, 0) / 3) * 5) : 40;

    return {
      probability: Math.round(probability),
      estimatedDate,
      confidence: Math.round(confidence)
    };
  }

  async getDailySummary(userId: string): Promise<DailySummary> {
    const [profile, activeGoals, habits_list] = await Promise.all([
      storage.getUserProfile(userId),
      storage.getUserGoals(userId, 'active'),
      storage.getUserHabits(userId)
    ]);

    const today = new Date();
    let completedToday = 0;
    let pendingToday = 0;
    let overallProgress = 0;

    for (const goal of activeGoals) {
      overallProgress += Number(goal.progress) || 0;
      const goalTasks = await storage.getTasksByGoal(goal.id);
      
      completedToday += goalTasks.filter(t => 
        t.status === 'completed' && 
        t.completedAt && 
        differenceInDays(today, new Date(t.completedAt)) === 0
      ).length;
      
      pendingToday += goalTasks.filter(t => 
        t.status === 'pending' || t.status === 'active'
      ).length;
    }

    overallProgress = activeGoals.length > 0 ? overallProgress / activeGoals.length : 0;

    const habitCompletionRate = await this.getHabitCompletionRate(userId, 7);

    const avgMotivation = Math.min(100, 50 + (profile?.streakCount || 0) * 2 + habitCompletionRate * 0.3);
    const avgAbility = Math.min(100, 40 + (profile?.currentLevel || 1) * 5 + (completedToday * 10));

    const tips = this.generateDailyTips(avgMotivation, avgAbility, pendingToday, profile?.streakCount || 0);
    const nudge = await this.generateDailyNudge(userId, avgMotivation, avgAbility);
    const priorityActions = this.determinePriorityActions(activeGoals, pendingToday, avgMotivation);

    return {
      date: format(today, 'yyyy-MM-dd'),
      overallProgress: Math.round(overallProgress),
      motivationScore: Math.round(avgMotivation),
      abilityScore: Math.round(avgAbility),
      completedTasks: completedToday,
      pendingTasks: pendingToday,
      activeGoals: activeGoals.length,
      currentStreak: profile?.streakCount || 0,
      tips,
      nudge,
      priorityActions
    };
  }

  private generateDailyTips(motivation: number, ability: number, pending: number, streak: number): string[] {
    const tips: string[] = [];

    if (motivation < 50) {
      tips.push("Start with your easiest task to build momentum");
    }
    if (ability < 50) {
      tips.push("Consider breaking complex tasks into smaller steps");
    }
    if (pending > 10) {
      tips.push("Focus on just 3 tasks today - quality over quantity");
    }
    if (streak > 7) {
      tips.push("Great streak! Maintain it by tackling one task early in the day");
    }
    if (streak === 0) {
      tips.push("Complete just one task today to start a new streak");
    }

    if (tips.length === 0) {
      tips.push("You're on track! Keep the momentum going");
    }

    return tips.slice(0, 3);
  }

  private async generateDailyNudge(userId: string, motivation: number, ability: number): Promise<string> {
    if (!this.isConfigured()) {
      if (motivation < 40) return "Small steps lead to big changes. What's one thing you can do right now?";
      if (ability < 40) return "You're capable of more than you know. Start simple and build up.";
      return "Today is a new opportunity. Make it count!";
    }

    try {
      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content: "Generate a brief, uplifting daily nudge (1 sentence) for a personal growth app user."
          },
          {
            role: "user",
            content: `Motivation: ${motivation}/100, Ability: ${ability}/100. Generate an encouraging nudge.`
          }
        ],
        max_tokens: 50
      });

      return completion.choices[0]?.message?.content || "Make today count!";
    } catch (error) {
      return "Every day is a chance to grow. You've got this!";
    }
  }

  private determinePriorityActions(goals: any[], pending: number, motivation: number): string[] {
    const actions: string[] = [];

    if (goals.length === 0) {
      actions.push("Set your first goal to get started");
    } else {
      const lowProgressGoals = goals.filter(g => Number(g.progress) < 20);
      if (lowProgressGoals.length > 0) {
        actions.push(`Focus on "${lowProgressGoals[0].title}" - early momentum matters`);
      }
    }

    if (pending > 5) {
      actions.push("Review and prioritize your pending tasks");
    }

    if (motivation < 50) {
      actions.push("Complete one small task to boost your confidence");
    }

    return actions.slice(0, 3);
  }

  async getRecommendationsForUser(userId: string): Promise<ReplanningRecommendation[]> {
    try {
      const logs = await db.select()
        .from(aiReplanningLogs)
        .where(and(
          eq(aiReplanningLogs.userId, userId),
          eq(aiReplanningLogs.status, 'pending')
        ))
        .orderBy(desc(aiReplanningLogs.createdAt))
        .limit(20);

      return logs.map(log => ({
        id: log.id,
        type: log.recommendationType as ReplanningRecommendation['type'],
        priority: (log.priority || 'medium') as ReplanningRecommendation['priority'],
        targetId: log.targetId,
        targetType: log.targetType as ReplanningRecommendation['targetType'],
        suggestion: log.suggestion,
        reasoning: log.reasoning,
        foggAnalysis: log.foggAnalysis as FoggAnalysis,
        proposedChanges: log.proposedChanges,
        createdAt: log.createdAt || new Date(),
        status: log.status || 'pending'
      }));
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      return [];
    }
  }

  async applyRecommendation(userId: string, recommendationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const [log] = await db.select()
        .from(aiReplanningLogs)
        .where(and(
          eq(aiReplanningLogs.id, recommendationId),
          eq(aiReplanningLogs.userId, userId)
        ))
        .limit(1);

      if (!log) {
        return { success: false, message: "Recommendation not found" };
      }

      if (log.status !== 'pending') {
        return { success: false, message: "Recommendation already processed" };
      }

      if (log.recommendationType === 'reschedule' && log.targetType === 'task' && log.proposedChanges?.dueDate) {
        await storage.updateTask(log.targetId, {
          dueDate: new Date(log.proposedChanges.dueDate)
        });
      }

      if (log.recommendationType === 'simplify' && log.targetType === 'task' && log.proposedChanges?.suggestedDifficulty) {
        await storage.updateTask(log.targetId, {
          difficultyRating: log.proposedChanges.suggestedDifficulty
        });
      }

      await db.update(aiReplanningLogs)
        .set({ 
          status: 'applied', 
          appliedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(aiReplanningLogs.id, recommendationId));

      return { success: true, message: "Recommendation applied successfully" };
    } catch (error) {
      console.error("Error applying recommendation:", error);
      return { success: false, message: "Failed to apply recommendation" };
    }
  }

  async dismissRecommendation(userId: string, recommendationId: string, reason?: string): Promise<{ success: boolean }> {
    try {
      await db.update(aiReplanningLogs)
        .set({ 
          status: 'dismissed', 
          dismissedAt: new Date(),
          dismissalReason: reason,
          updatedAt: new Date()
        })
        .where(and(
          eq(aiReplanningLogs.id, recommendationId),
          eq(aiReplanningLogs.userId, userId)
        ));

      return { success: true };
    } catch (error) {
      console.error("Error dismissing recommendation:", error);
      return { success: false };
    }
  }

  private async saveRecommendation(userId: string, recommendation: ReplanningRecommendation): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await db.insert(aiReplanningLogs).values({
        id: recommendation.id,
        userId,
        targetId: recommendation.targetId,
        targetType: recommendation.targetType,
        recommendationType: recommendation.type,
        priority: recommendation.priority,
        suggestion: recommendation.suggestion,
        reasoning: recommendation.reasoning,
        foggAnalysis: recommendation.foggAnalysis,
        proposedChanges: recommendation.proposedChanges,
        status: 'pending',
        aiModel: AI_MODEL,
        confidenceScore: String(recommendation.foggAnalysis.behaviorProbability),
        expiresAt
      });
    } catch (error) {
      console.error("Error saving recommendation:", error);
    }
  }

  private async generateRecommendationsForGoal(
    userId: string,
    goal: any,
    tasks: any[],
    foggAnalysis: FoggAnalysis,
    bottlenecks: string[]
  ): Promise<ReplanningRecommendation[]> {
    const recommendations: ReplanningRecommendation[] = [];

    if (foggAnalysis.motivation.score < 40) {
      recommendations.push({
        id: `rec-motivate-${goal.id}-${Date.now()}`,
        type: 'motivate',
        priority: 'high',
        targetId: goal.id,
        targetType: 'goal',
        suggestion: "Consider setting a small, achievable milestone for this week",
        reasoning: "Low motivation detected. Quick wins can rebuild momentum.",
        foggAnalysis,
        createdAt: new Date(),
        status: 'pending'
      });
    }

    if (foggAnalysis.ability.score < 40) {
      recommendations.push({
        id: `rec-simplify-${goal.id}-${Date.now()}`,
        type: 'simplify',
        priority: 'high',
        targetId: goal.id,
        targetType: 'goal',
        suggestion: "Reduce task complexity or extend deadlines",
        reasoning: "Current workload may be exceeding comfortable capacity.",
        foggAnalysis,
        createdAt: new Date(),
        status: 'pending'
      });
    }

    const progress = Number(goal.progress) || 0;
    if (progress < 20 && differenceInDays(new Date(), new Date(goal.createdAt || new Date())) > 14) {
      recommendations.push({
        id: `rec-pause-${goal.id}-${Date.now()}`,
        type: 'pause',
        priority: 'medium',
        targetId: goal.id,
        targetType: 'goal',
        suggestion: "Consider pausing this goal to focus on others",
        reasoning: "Limited progress over 2+ weeks suggests this may not be the right time.",
        foggAnalysis,
        createdAt: new Date(),
        status: 'pending'
      });
    }

    for (const rec of recommendations) {
      await this.saveRecommendation(userId, rec);
    }

    return recommendations;
  }
}

export const aiReplanningEngine = new AIReplanningEngine();
