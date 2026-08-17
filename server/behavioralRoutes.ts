/**
 * Behavioral Science API Routes
 * 
 * Endpoints for Fogg, SDT, and COM-B behavioral assessments
 */

import type { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import { isAuthenticated } from './replitAuth';
import { db } from './storage';
import { 
  behavioralAssessments, 
  microSteps, 
  weeklyReports, 
  goals,
  tasks,
  taskPlans,
  userProfiles,
  teams,
  teamMembers,
  friendConnections
} from '@shared/schema';
import { eq, and, gte, desc, between } from 'drizzle-orm';
import { orchestrateAssessment, createWeeklyReport, trackBehaviorChange } from '../packages/behavior/engine';
import type {
  CheckInData,
  GoalHistory,
  PromptContext,
  AutonomyData,
  CompetenceData,
  RelatednessData,
  CapabilityFactors,
  OpportunityFactors,
  MotivationFactors,
  BehavioralAssessmentResult
} from '../packages/behavior/engine';
import { subDays, startOfWeek, endOfWeek } from 'date-fns';
import { requireFeatureFlag } from './middleware/featureFlags';
import { checkBehavioralConsent } from './analytics/posthog';

export function registerBehavioralRoutes(app: Express) {
  
  // POST /api/coach/v1/assess - Run comprehensive behavioral assessment
  app.post('/api/coach/v1/assess', 
    isAuthenticated, 
    requireFeatureFlag('coach_engine_v1') as RequestHandler,
    async (req: Request, res: Response) => {
    const user = (req as any).user;
    try {
      const userId = user?.claims?.sub;
      const { goalId } = req.body;
      
      if (!goalId) {
        return res.status(400).json({ message: 'goalId is required' });
      }
      
      // Check behavioral consent
      const hasConsent = await checkBehavioralConsent(userId);
      if (!hasConsent) {
        return res.status(403).json({ 
          message: 'Behavioral data collection requires consent',
          error: 'Please enable behavioral research consent in your settings to use this feature',
          consentRequired: true
        });
      }
      
      // Gather user data for assessment
      const userData = await gatherUserDataForAssessment(userId, goalId);
      
      if (!userData) {
        return res.status(404).json({ message: 'Goal not found or insufficient data' });
      }
      
      // Run behavioral assessment
      const assessment = await orchestrateAssessment(
        userId,
        goalId,
        userData
      );
      
      // Save assessment to database
      const savedAssessment = await db.insert(behavioralAssessments).values({
        userId,
        goalId,
        foggScore: assessment.fogg.behaviorScore,
        motivationScore: assessment.fogg.motivation,
        abilityScore: assessment.fogg.ability,
        promptType: assessment.fogg.promptType,
        sdtAutonomy: assessment.sdt.autonomy,
        sdtCompetence: assessment.sdt.competence,
        sdtRelatedness: assessment.sdt.relatedness,
        sdtWellbeing: assessment.sdt.overallWellbeing,
        motivationType: assessment.sdt.motivationType,
        combCapability: {
          physical: assessment.comb.capability.physical,
          psychological: assessment.comb.capability.psychological,
          score: assessment.comb.capability.score
        },
        combOpportunity: {
          social: assessment.comb.opportunity.social,
          physical: assessment.comb.opportunity.physical,
          score: assessment.comb.opportunity.score
        },
        combMotivation: {
          reflective: assessment.comb.motivation.reflective,
          automatic: assessment.comb.motivation.automatic,
          score: assessment.comb.motivation.score
        },
        combReadiness: assessment.comb.overallReadiness,
        barriers: assessment.comb.criticalBarriers,
        interventions: assessment.interventions,
        overallReadiness: assessment.overallReadiness,
        topRecommendations: assessment.topRecommendations,
        criticalActions: assessment.criticalActions
      }).returning();
      
      // Save micro-steps
      const microStepsToSave = assessment.microSteps.map(step => ({
        userId,
        goalId,
        assessmentId: savedAssessment[0].id,
        step: step.step,
        difficulty: step.difficulty,
        estimatedTime: step.estimatedTime,
        trigger: step.trigger
      }));
      
      await db.insert(microSteps).values(microStepsToSave);
      
      res.json({
        assessment: savedAssessment[0],
        microSteps: microStepsToSave,
        insights: assessment.topRecommendations
      });
      
    } catch (error: any) {
      console.error('Error running behavioral assessment:', error);
      res.status(500).json({ message: 'Failed to run assessment', error: error.message });
    }
  });
  
  // GET /api/coach/v1/insights/:userId - Get current behavioral insights
  app.get('/api/coach/v1/insights/:userId', 
    isAuthenticated,
    requireFeatureFlag('insights_v1') as RequestHandler,
    async (req: Request, res: Response) => {
    const user = (req as any).user;
    try {
      const { userId } = req.params;
      const requestingUserId = user?.claims?.sub;
      
      // Only allow users to view their own insights
      if (userId !== requestingUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Check behavioral consent
      const hasConsent = await checkBehavioralConsent(userId);
      if (!hasConsent) {
        return res.status(403).json({ 
          message: 'Behavioral insights require consent',
          error: 'Please enable behavioral research consent in your settings to view insights',
          consentRequired: true
        });
      }
      
      // Get most recent assessment
      const recentAssessment = await db.select()
        .from(behavioralAssessments)
        .where(eq(behavioralAssessments.userId, userId))
        .orderBy(desc(behavioralAssessments.timestamp))
        .limit(1);
      
      if (recentAssessment.length === 0) {
        return res.status(404).json({ message: 'No assessments found' });
      }
      
      // Get associated micro-steps
      const steps = await db.select()
        .from(microSteps)
        .where(and(
          eq(microSteps.userId, userId),
          eq(microSteps.assessmentId, recentAssessment[0].id)
        ));
      
      res.json({
        assessment: recentAssessment[0],
        microSteps: steps,
        insights: recentAssessment[0].topRecommendations
      });
      
    } catch (error: any) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ message: 'Failed to fetch insights' });
    }
  });
  
  // POST /api/coach/v1/micro-steps - Generate micro-steps for a goal
  app.post('/api/coach/v1/micro-steps', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { goalId } = req.body;
      
      if (!goalId) {
        return res.status(400).json({ message: 'goalId is required' });
      }
      
      // Get most recent assessment for this goal
      const assessment = await db.select()
        .from(behavioralAssessments)
        .where(and(
          eq(behavioralAssessments.userId, userId),
          eq(behavioralAssessments.goalId, goalId)
        ))
        .orderBy(desc(behavioralAssessments.timestamp))
        .limit(1);
      
      if (assessment.length === 0) {
        return res.status(404).json({ 
          message: 'No assessment found for this goal. Please run an assessment first.' 
        });
      }
      
      // Get micro-steps for this assessment
      const steps = await db.select()
        .from(microSteps)
        .where(and(
          eq(microSteps.userId, userId),
          eq(microSteps.assessmentId, assessment[0].id)
        ));
      
      res.json({ microSteps: steps });
      
    } catch (error: any) {
      console.error('Error fetching micro-steps:', error);
      res.status(500).json({ message: 'Failed to fetch micro-steps' });
    }
  });
  
  // POST /api/coach/v1/micro-steps/:stepId/complete - Mark micro-step as complete
  app.post('/api/coach/v1/micro-steps/:stepId/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stepId } = req.params;
      
      // Update micro-step
      const updated = await db.update(microSteps)
        .set({ 
          completed: true, 
          completedAt: new Date() 
        })
        .where(and(
          eq(microSteps.id, stepId),
          eq(microSteps.userId, userId)
        ))
        .returning();
      
      if (updated.length === 0) {
        return res.status(404).json({ message: 'Micro-step not found' });
      }
      
      res.json({ microStep: updated[0] });
      
    } catch (error: any) {
      console.error('Error completing micro-step:', error);
      res.status(500).json({ message: 'Failed to complete micro-step' });
    }
  });
  
  // GET /api/reports/weekly/:userId - Get weekly behavioral report
  app.get('/api/reports/weekly/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user.claims.sub;
      
      // Only allow users to view their own reports
      if (userId !== requestingUserId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      
      // Check if report already exists for this week
      const existingReport = await db.select()
        .from(weeklyReports)
        .where(and(
          eq(weeklyReports.userId, userId),
          gte(weeklyReports.weekStart, weekStart)
        ))
        .limit(1);
      
      if (existingReport.length > 0) {
        return res.json({ report: existingReport[0] });
      }
      
      // Generate new weekly report
      const weeklyData = await gatherWeeklyData(userId, weekStart, weekEnd);
      
      const report = createWeeklyReport(
        userId,
        weekStart,
        weekEnd,
        weeklyData
      );
      
      // Save report to database
      const savedReport = await db.insert(weeklyReports).values({
        userId,
        weekStart: report.weekStart,
        weekEnd: report.weekEnd,
        triggerHeatmap: report.triggerHeatmap,
        barrierAnalysis: report.barrierAnalysis,
        behaviorChangeScore: report.behaviorChangeScore,
        sdtTrends: report.sdtTrends,
        recommendations: report.recommendations
      }).returning();
      
      res.json({ report: savedReport[0] });
      
    } catch (error: any) {
      console.error('Error generating weekly report:', error);
      res.status(500).json({ message: 'Failed to generate weekly report' });
    }
  });
  
  // POST /api/coach/v1/barriers - Identify barriers using COM-B
  app.post('/api/coach/v1/barriers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { goalId } = req.body;
      
      // Get most recent assessment
      const assessment = await db.select()
        .from(behavioralAssessments)
        .where(and(
          eq(behavioralAssessments.userId, userId),
          goalId ? eq(behavioralAssessments.goalId, goalId) : undefined as any
        ))
        .orderBy(desc(behavioralAssessments.timestamp))
        .limit(1);
      
      if (assessment.length === 0) {
        return res.status(404).json({ message: 'No assessment found' });
      }
      
      res.json({
        barriers: assessment[0].barriers,
        interventions: assessment[0].interventions,
        capability: assessment[0].combCapability,
        opportunity: assessment[0].combOpportunity,
        motivation: assessment[0].combMotivation
      });
      
    } catch (error: any) {
      console.error('Error fetching barriers:', error);
      res.status(500).json({ message: 'Failed to fetch barriers' });
    }
  });
}

// Helper: Gather user data for behavioral assessment
async function gatherUserDataForAssessment(userId: string, goalId: string) {
  try {
    // Get goal details
    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
    if (!goal) return null;
    
    // Get user profile
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    
    // Get tasks for check-in data (via goals since tasks don't have userId directly)
    const userTasks = await db.select()
      .from(tasks)
      .innerJoin(goals, eq(tasks.goalId, goals.id))
      .where(eq(goals.userId, userId));
    const completedTasks = userTasks.filter(t => t.tasks.status === 'completed').length;
    const missedTasks = userTasks.filter(t => t.tasks.status === 'failed' || (t.tasks.dueDate && new Date(t.tasks.dueDate) < new Date() && t.tasks.status !== 'completed')).length;
    
    // Get goal history
    const userGoals = await db.select().from(goals).where(eq(goals.userId, userId));
    const completedGoals = userGoals.filter(g => g.status === 'completed').length;
    
    // Get team and social data
    const userTeams = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    const friends = await db.select().from(friendConnections)
      .where(eq(friendConnections.userId, userId));
    
    // Build check-in data
    const checkIns: CheckInData = {
      completedTasks,
      missedTasks,
      streakDays: profile?.streakCount || 0,
      lastCheckIn: new Date() // Simplified
    };
    
    // Build goal history
    const goalHistory: GoalHistory = {
      totalGoals: userGoals.length,
      completedGoals,
      activeGoals: userGoals.filter(g => g.status === 'active').length,
      averageCompletionRate: userGoals.length > 0 ? completedGoals / userGoals.length : 0,
      category: goal.category
    };
    
    // Build prompt context
    const hour = new Date().getHours();
    const context: PromptContext = {
      timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night',
      previousTaskCompleted: completedTasks > 0,
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
      energyLevel: 7 // Default
    };
    
    // Build autonomy data (goals don't have aiGenerated field, count all as self-set)
    const selfSetGoals = userGoals.length;
    const autonomyData: AutonomyData = {
      userChoices: {
        selfSetGoals,
        totalGoals: userGoals.length,
        customizedSettings: true,
        declinedSuggestions: 0 // Would track this separately
      },
      controlLevel: {
        canModifyGoals: true,
        canSetOwnSchedule: true,
        hasVetoRights: true,
        flexibilityScore: 8
      }
    };
    
    // Build competence data
    const competenceData: CompetenceData = {
      achievements: {
        total: 0, // Would pull from achievements table
        recent: 0,
        categories: {}
      },
      progressRate: {
        goalsCompleted: completedGoals,
        goalsActive: goalHistory.activeGoals,
        averageCompletionTime: 30, // Simplified
        improvementTrend: 'stable' as const
      },
      skillDevelopment: {
        newSkillsLearned: 0,
        masteryLevel: {}
      }
    };
    
    // Build relatedness data
    const relatednessData: RelatednessData = {
      teamActivity: {
        teamsJoined: userTeams.length,
        teamGoalsShared: 0,
        collaborationFrequency: userTeams.length > 0 ? 3 : 0,
        supportGiven: 0,
        supportReceived: 0
      },
      communityEngagement: {
        friendsCount: friends.length,
        activeFriends: friends.filter(f => f.status === 'accepted').length,
        challengesJoined: 0,
        socialPosts: 0,
        commentsReceived: 0
      },
      socialSupport: {
        mentorshipActive: false,
        peerSupportScore: friends.length > 0 ? 6 : 3,
        feelingOfBelonging: friends.length > 0 ? 7 : 4
      }
    };
    
    // Build capability factors
    const capabilityFactors: CapabilityFactors = {
      physical: {
        healthStatus: 'good',
        energyLevel: 7,
        physicalLimitations: [],
        sleepQuality: 7
      },
      psychological: {
        knowledgeLevel: 6,
        cognitiveLoad: 5,
        attentionCapacity: 7,
        skillsRequired: [],
        skillsPresent: []
      }
    };
    
    // Build opportunity factors
    const opportunityFactors: OpportunityFactors = {
      social: {
        supportNetwork: friends.length > 0 ? 7 : 4,
        peerInfluence: 'neutral',
        culturalNorms: 'supportive',
        accountability: userTeams.length > 0
      },
      physical: {
        accessToResources: 7,
        environmentalCues: 'helpful',
        timeAvailability: profile?.dailyTimeCommitment || 60,
        financialResources: 6
      }
    };
    
    // Build motivation factors
    const motivationFactors: MotivationFactors = {
      reflective: {
        beliefInGoal: 7,
        identityAlignment: 6,
        outcomeExpectancy: 7,
        valueAlignment: 8
      },
      automatic: {
        habits: [],
        emotionalResponse: 'positive',
        pastExperiences: completedGoals > 0 ? 'successful' : 'mixed',
        immediateRewards: 5
      }
    };
    
    return {
      checkIns,
      goalHistory,
      goal: {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        complexity: (goal.difficultyLevel ?? 5) >= 7 ? 'complex' : (goal.difficultyLevel ?? 5) >= 4 ? 'moderate' : 'simple',
        estimatedDuration: goal.estimatedDuration
      },
      userResources: {
        availableTimePerDay: profile?.dailyTimeCommitment || 60,
        completedInCategory: userGoals.filter(g => g.category === goal.category && g.status === 'completed').length,
        skills: [],
        supportNetwork: friends.length
      },
      context,
      userHistory: {
        mostProductiveTime: 'morning',
        preferredPromptType: 'notification',
        responseRate: { notification: 0.8, email: 0.6 }
      },
      autonomyData,
      competenceData,
      relatednessData,
      capabilityFactors,
      opportunityFactors,
      motivationFactors
    };
  } catch (error) {
    console.error('Error gathering user data:', error);
    return null;
  }
}

// Helper: Gather weekly data for report
async function gatherWeeklyData(userId: string, weekStart: Date, weekEnd: Date) {
  const dbAssessments = await db.select()
    .from(behavioralAssessments)
    .where(and(
      eq(behavioralAssessments.userId, userId),
      between(behavioralAssessments.timestamp, weekStart, weekEnd)
    ));
  
  // Get completed tasks via goals join since tasks don't have userId directly
  const completedTasksResult = await db.select()
    .from(tasks)
    .innerJoin(goals, eq(tasks.goalId, goals.id))
    .where(and(
      eq(goals.userId, userId),
      eq(tasks.status, 'completed'),
      between(tasks.completedAt, weekStart, weekEnd)
    ));
  
  // Simplified barrier tracking
  const allBarriers = dbAssessments.flatMap(a => a.barriers || []);
  
  // Transform database assessments to match BehavioralAssessmentResult interface
  // Note: The createWeeklyReport function only uses basic properties from assessments
  const assessments = dbAssessments as unknown as BehavioralAssessmentResult[];
  
  return {
    assessments,
    completedTasks: completedTasksResult.map(t => ({
      completedAt: t.tasks.completedAt || new Date(),
      context: {
        timeOfDay: 'morning' as const,
        previousTaskCompleted: true,
        dayOfWeek: 'monday'
      }
    })),
    barriersTracked: allBarriers.map((b: any) => ({
      barrier: b.description || 'Unknown barrier',
      resolved: false,
      date: new Date()
    }))
  };
}
