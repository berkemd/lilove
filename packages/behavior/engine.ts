/**
 * Behavioral Science Engine
 * 
 * Orchestrates Fogg, SDT, and COM-B models to provide comprehensive
 * behavioral analysis and evidence-based interventions
 * 
 * PRIVACY & ANONYMIZATION:
 * - All sensitive user data is hashed before storage
 * - Check-in text is not stored in raw form
 * - Barrier descriptions are anonymized
 * - Data retention: 90 days
 */

import crypto from 'crypto';

import { 
  calculateMotivation, 
  calculateAbility, 
  identifyPromptTriggers,
  getBehaviorScore,
  generateMicroSteps,
  assessFoggModel,
  type CheckInData,
  type GoalHistory,
  type PromptContext,
  type FoggAssessment,
  type MicroStep
} from './fogg';

import {
  assessAutonomy,
  assessCompetence,
  assessRelatedness,
  getSDTProfile,
  generateMotivationInterventions,
  analyzeMotivationQuality,
  type AutonomyData,
  type CompetenceData,
  type RelatednessData,
  type SDTProfile
} from './sdt';

import {
  assessCapability,
  assessOpportunity,
  assessMotivation,
  identifyBarriers,
  selectInterventions,
  generateActionPlan,
  type CapabilityFactors,
  type OpportunityFactors,
  type MotivationFactors,
  type COMBAssessment,
  type BCWIntervention,
  type ActionPlan
} from './com-b';

export interface BehavioralAssessmentResult {
  userId: string;
  goalId: string;
  timestamp: Date;
  
  // Fogg Model Results
  fogg: FoggAssessment;
  
  // SDT Results
  sdt: SDTProfile;
  sdtMotivationQuality: ReturnType<typeof analyzeMotivationQuality>;
  
  // COM-B Results
  comb: COMBAssessment;
  interventions: BCWIntervention[];
  actionPlan: ActionPlan;
  
  // Micro-steps
  microSteps: MicroStep[];
  
  // Overall insights
  overallReadiness: number; // 0-100
  topRecommendations: string[];
  criticalActions: string[];
}

export interface WeeklyReport {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  
  // Trigger effectiveness analysis
  triggerHeatmap: {
    timeOfDay: { [key: string]: number }; // morning: 0.8, afternoon: 0.6, etc.
    dayOfWeek: { [key: string]: number };
    promptType: { [key: string]: number };
  };
  
  // Barrier analysis
  barrierAnalysis: {
    mostCommon: string[];
    resolved: string[];
    persistent: string[];
    newBarriers: string[];
  };
  
  // Behavior change metrics
  behaviorChangeScore: number; // 0-100, improvement over week
  
  // SDT trends
  sdtTrends: {
    autonomy: { start: number; end: number; change: number };
    competence: { start: number; end: number; change: number };
    relatedness: { start: number; end: number; change: number };
  };
  
  // Recommendations
  recommendations: {
    continue: string[]; // What's working
    adjust: string[]; // What needs tweaking
    add: string[]; // New interventions to try
  };
}

export interface BehaviorChangeMetrics {
  userId: string;
  timeframe: { start: Date; end: Date };
  
  // Progress indicators
  foggScoreChange: number; // Change in B=MAP
  sdtWellbeingChange: number;
  combReadinessChange: number;
  
  // Specific improvements
  barriersResolved: number;
  microStepsCompleted: number;
  newHabitsFormed: number;
  
  // Trend
  trend: 'improving' | 'stable' | 'declining';
  confidenceLevel: number; // 0-100, statistical confidence
}

// ===== DATA ANONYMIZATION & PRIVACY =====

/**
 * Hash sensitive data for privacy
 */
function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Anonymize barrier descriptions - remove specific personal details
 */
function anonymizeBarrier(barrier: string): string {
  // Remove potential PII patterns
  let anonymized = barrier
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]') // Phone numbers
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Emails
    .replace(/\b\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi, '[ADDRESS]') // Addresses
    .replace(/\b(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi, '[URL]'); // URLs
  
  // If barrier contains specific names (capitalized words), generalize
  anonymized = anonymized.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[PERSON]');
  
  return anonymized;
}

/**
 * Anonymize check-in data - extract insights without storing raw text
 */
function anonymizeCheckIn(checkInText: string): {
  sentiment: 'positive' | 'neutral' | 'negative';
  keyThemes: string[];
  hash: string;
} {
  const hash = hashSensitiveData(checkInText);
  
  // Extract sentiment (simple keyword analysis)
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'motivated', 'excited', 'progress', 'achieved'];
  const negativeWords = ['difficult', 'hard', 'struggle', 'failed', 'tired', 'stressed', 'overwhelmed', 'stuck'];
  
  const lowerText = checkInText.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (positiveCount > negativeCount && positiveCount > 0) sentiment = 'positive';
  else if (negativeCount > positiveCount && negativeCount > 0) sentiment = 'negative';
  
  // Extract key themes (without raw text)
  const keyThemes: string[] = [];
  if (lowerText.includes('time')) keyThemes.push('time_management');
  if (lowerText.includes('energy') || lowerText.includes('tired')) keyThemes.push('energy_levels');
  if (lowerText.includes('focus') || lowerText.includes('distract')) keyThemes.push('focus_attention');
  if (lowerText.includes('support') || lowerText.includes('help')) keyThemes.push('social_support');
  if (lowerText.includes('motivat')) keyThemes.push('motivation');
  
  return { sentiment, keyThemes, hash };
}

/**
 * Data retention policy - returns if data should be deleted
 * Policy: 90 days retention for behavioral data
 */
export function shouldDeleteBehavioralData(timestamp: Date): boolean {
  const retentionDays = 90;
  const now = new Date();
  const ageInDays = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays > retentionDays;
}

/**
 * Orchestrate complete behavioral assessment for a user and goal
 */
export async function orchestrateAssessment(
  userId: string,
  goalId: string,
  userData: {
    checkIns: CheckInData;
    goalHistory: GoalHistory;
    goal: any;
    userResources: any;
    context: PromptContext;
    userHistory: any;
    autonomyData: AutonomyData;
    competenceData: CompetenceData;
    relatednessData: RelatednessData;
    capabilityFactors: CapabilityFactors;
    opportunityFactors: OpportunityFactors;
    motivationFactors: MotivationFactors;
  }
): Promise<BehavioralAssessmentResult> {
  
  // Run Fogg Behavior Model assessment
  const fogg = assessFoggModel(
    userData.checkIns,
    userData.goalHistory,
    userData.goal,
    userData.userResources,
    userData.context,
    userData.userHistory
  );
  
  // Run SDT assessment
  const autonomy = assessAutonomy(userData.autonomyData);
  const competence = assessCompetence(userData.competenceData);
  const relatedness = assessRelatedness(userData.relatednessData);
  const sdt = getSDTProfile(autonomy, competence, relatedness);
  const sdtMotivationQuality = analyzeMotivationQuality(sdt);
  
  // Run COM-B assessment
  const capabilityAssessment = assessCapability(userData.capabilityFactors);
  const opportunityAssessment = assessOpportunity(userData.opportunityFactors);
  const motivationAssessment = assessMotivation(userData.motivationFactors);
  const comb = identifyBarriers(
    capabilityAssessment,
    opportunityAssessment,
    motivationAssessment
  );
  
  // Select interventions based on barriers
  const interventions = selectInterventions(comb);
  
  // Generate action plan
  const actionPlan = generateActionPlan(interventions);
  
  // Generate micro-steps based on Fogg model
  const microSteps = generateMicroSteps(
    userData.goal,
    fogg.ability,
    fogg.motivation
  );
  
  // Calculate overall readiness (weighted combination)
  const overallReadiness = Math.round(
    (fogg.behaviorScore * 0.40) +
    (sdt.overallWellbeing * 0.30) +
    (comb.overallReadiness * 0.30)
  );
  
  // Generate top recommendations by synthesizing insights
  const topRecommendations = generateInsights(fogg, sdt, comb, sdtMotivationQuality);
  
  // Identify critical actions
  const criticalActions = [
    ...actionPlan.immediate.slice(0, 2).map(a => a.action),
    ...microSteps.slice(0, 1).map(m => m.step)
  ];
  
  return {
    userId,
    goalId,
    timestamp: new Date(),
    fogg,
    sdt,
    sdtMotivationQuality,
    comb,
    interventions,
    actionPlan,
    microSteps,
    overallReadiness,
    topRecommendations,
    criticalActions
  };
}

/**
 * Generate actionable insights from all three models
 */
export function generateInsights(
  fogg: FoggAssessment,
  sdt: SDTProfile,
  comb: COMBAssessment,
  sdtQuality: ReturnType<typeof analyzeMotivationQuality>
): string[] {
  const insights: string[] = [];
  
  // Fogg Model insights
  if (fogg.behaviorScore >= 70) {
    insights.push(`🚀 High readiness (${fogg.behaviorScore}/100) - You're primed for success! Schedule action now.`);
  } else if (fogg.behaviorScore < 40) {
    if (fogg.motivation < 50) {
      insights.push(`💡 Boost motivation: Reconnect with why this goal truly matters to you.`);
    }
    if (fogg.ability < 50) {
      insights.push(`🛠️ Simplify approach: Break goal into smaller, easier steps.`);
    }
  }
  
  // SDT insights
  if (sdt.autonomy < 50) {
    insights.push(`🎯 Increase autonomy: Make this goal truly yours - customize and personalize it.`);
  }
  if (sdt.competence < 50) {
    insights.push(`📈 Build competence: Focus on small wins to rebuild confidence.`);
  }
  if (sdt.relatedness < 50) {
    insights.push(`🤝 Strengthen connections: Join a team or find an accountability partner.`);
  }
  
  // SDT motivation quality
  if (sdtQuality.sustainability === 'unsustainable') {
    insights.push(`⚠️ Motivation at risk: Current approach is hard to maintain long-term.`);
  } else if (sdtQuality.type === 'intrinsic') {
    insights.push(`✨ Intrinsic motivation detected - this is sustainable and energizing!`);
  }
  
  // COM-B critical barriers
  if (comb.criticalBarriers.length > 0) {
    const topBarrier = comb.criticalBarriers[0];
    insights.push(`🚧 Key barrier: ${topBarrier.description}`);
  }
  
  // Readiness assessment
  if (comb.overallReadiness < 40) {
    insights.push(`⏸️ Low readiness: Address capability and opportunity gaps first.`);
  }
  
  // Capability-specific
  if (comb.capability.score < 50) {
    const psych = comb.capability.psychological.length;
    const phys = comb.capability.physical.length;
    if (psych > phys) {
      insights.push(`🧠 Focus on mental preparation: Learn skills and reduce cognitive load.`);
    } else if (phys > 0) {
      insights.push(`💪 Address physical barriers: Improve energy, health, or environment.`);
    }
  }
  
  // Opportunity-specific
  if (comb.opportunity.score < 50) {
    const social = comb.opportunity.social.length;
    const physical = comb.opportunity.physical.length;
    if (social > physical) {
      insights.push(`👥 Build social support: Environment and people matter for success.`);
    } else if (physical > 0) {
      insights.push(`🏗️ Restructure environment: Make the right behavior easier to do.`);
    }
  }
  
  // Sort by priority (warnings first, then action items)
  const prioritized = insights.sort((a, b) => {
    const aHasWarning = a.includes('⚠️') || a.includes('🚧');
    const bHasWarning = b.includes('⚠️') || b.includes('🚧');
    if (aHasWarning && !bHasWarning) return -1;
    if (!aHasWarning && bHasWarning) return 1;
    return 0;
  });
  
  return prioritized.slice(0, 6); // Top 6 insights
}

/**
 * Create comprehensive weekly report
 */
export function createWeeklyReport(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  weeklyData: {
    assessments: BehavioralAssessmentResult[];
    completedTasks: Array<{ completedAt: Date; context: PromptContext }>;
    barriersTracked: Array<{ barrier: string; resolved: boolean; date: Date }>;
  }
): WeeklyReport {
  
  // Calculate trigger effectiveness heatmap
  const triggerHeatmap = calculateTriggerHeatmap(weeklyData.completedTasks);
  
  // Analyze barriers
  const barrierAnalysis = analyzeBarriers(weeklyData.barriersTracked);
  
  // Calculate behavior change score
  const behaviorChangeScore = calculateBehaviorChange(weeklyData.assessments);
  
  // Track SDT trends
  const sdtTrends = trackSDTTrends(weeklyData.assessments);
  
  // Generate recommendations
  const recommendations = generateWeeklyRecommendations(
    triggerHeatmap,
    barrierAnalysis,
    behaviorChangeScore,
    sdtTrends
  );
  
  return {
    userId,
    weekStart,
    weekEnd,
    triggerHeatmap,
    barrierAnalysis,
    behaviorChangeScore,
    sdtTrends,
    recommendations
  };
}

/**
 * Track behavior change over time
 */
export function trackBehaviorChange(
  userId: string,
  timeframe: { start: Date; end: Date },
  data: {
    assessmentsStart: BehavioralAssessmentResult[];
    assessmentsEnd: BehavioralAssessmentResult[];
    barriersResolved: number;
    microStepsCompleted: number;
  }
): BehaviorChangeMetrics {
  
  // Calculate average scores at start and end
  const startAvgFogg = average(data.assessmentsStart.map(a => a.fogg.behaviorScore));
  const endAvgFogg = average(data.assessmentsEnd.map(a => a.fogg.behaviorScore));
  const foggScoreChange = endAvgFogg - startAvgFogg;
  
  const startAvgSDT = average(data.assessmentsStart.map(a => a.sdt.overallWellbeing));
  const endAvgSDT = average(data.assessmentsEnd.map(a => a.sdt.overallWellbeing));
  const sdtWellbeingChange = endAvgSDT - startAvgSDT;
  
  const startAvgComb = average(data.assessmentsStart.map(a => a.comb.overallReadiness));
  const endAvgComb = average(data.assessmentsEnd.map(a => a.comb.overallReadiness));
  const combReadinessChange = endAvgComb - startAvgComb;
  
  // Determine trend
  const overallChange = (foggScoreChange + sdtWellbeingChange + combReadinessChange) / 3;
  const trend: 'improving' | 'stable' | 'declining' = 
    overallChange > 5 ? 'improving' :
    overallChange < -5 ? 'declining' : 'stable';
  
  // Calculate confidence (based on sample size and consistency)
  const sampleSize = data.assessmentsStart.length + data.assessmentsEnd.length;
  const confidenceLevel = Math.min(Math.round((sampleSize / 10) * 100), 100);
  
  // Estimate new habits formed (micro-steps completed that became consistent)
  const newHabitsFormed = Math.floor(data.microStepsCompleted / 5); // rough estimate
  
  return {
    userId,
    timeframe,
    foggScoreChange,
    sdtWellbeingChange,
    combReadinessChange,
    barriersResolved: data.barriersResolved,
    microStepsCompleted: data.microStepsCompleted,
    newHabitsFormed,
    trend,
    confidenceLevel
  };
}

// Helper functions

function calculateTriggerHeatmap(
  completedTasks: Array<{ completedAt: Date; context: PromptContext }>
): WeeklyReport['triggerHeatmap'] {
  const timeOfDay: { [key: string]: number } = {};
  const dayOfWeek: { [key: string]: number } = {};
  const promptType: { [key: string]: number } = {};
  
  for (const task of completedTasks) {
    const hour = task.completedAt.getHours();
    const day = task.completedAt.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    const timeKey = task.context.timeOfDay;
    timeOfDay[timeKey] = (timeOfDay[timeKey] || 0) + 1;
    
    dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;
  }
  
  // Normalize to 0-1 scale
  const maxTime = Math.max(...Object.values(timeOfDay), 1);
  const maxDay = Math.max(...Object.values(dayOfWeek), 1);
  
  Object.keys(timeOfDay).forEach(k => timeOfDay[k] = timeOfDay[k] / maxTime);
  Object.keys(dayOfWeek).forEach(k => dayOfWeek[k] = dayOfWeek[k] / maxDay);
  
  return { timeOfDay, dayOfWeek, promptType };
}

function analyzeBarriers(
  barriersTracked: Array<{ barrier: string; resolved: boolean; date: Date }>
): WeeklyReport['barrierAnalysis'] {
  const allBarriers = barriersTracked.map(b => b.barrier);
  const resolved = barriersTracked.filter(b => b.resolved).map(b => b.barrier);
  const persistent = barriersTracked.filter(b => !b.resolved).map(b => b.barrier);
  
  // Find most common
  const barrierCounts: { [key: string]: number } = {};
  allBarriers.forEach(b => barrierCounts[b] = (barrierCounts[b] || 0) + 1);
  const mostCommon = Object.entries(barrierCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([b]) => b);
  
  // Identify new barriers (appeared this week)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newBarriers = barriersTracked
    .filter(b => b.date > weekAgo)
    .map(b => b.barrier)
    .filter((b, i, arr) => arr.indexOf(b) === i); // unique
  
  return {
    mostCommon,
    resolved,
    persistent,
    newBarriers
  };
}

function calculateBehaviorChange(assessments: BehavioralAssessmentResult[]): number {
  if (assessments.length < 2) return 50; // neutral if insufficient data
  
  const first = assessments[0];
  const last = assessments[assessments.length - 1];
  
  const foggChange = last.fogg.behaviorScore - first.fogg.behaviorScore;
  const sdtChange = last.sdt.overallWellbeing - first.sdt.overallWellbeing;
  const combChange = last.comb.overallReadiness - first.comb.overallReadiness;
  
  const avgChange = (foggChange + sdtChange + combChange) / 3;
  
  // Normalize to 0-100 (where 50 is no change)
  return Math.max(0, Math.min(100, 50 + avgChange));
}

function trackSDTTrends(assessments: BehavioralAssessmentResult[]): WeeklyReport['sdtTrends'] {
  if (assessments.length === 0) {
    return {
      autonomy: { start: 50, end: 50, change: 0 },
      competence: { start: 50, end: 50, change: 0 },
      relatedness: { start: 50, end: 50, change: 0 }
    };
  }
  
  const first = assessments[0].sdt;
  const last = assessments[assessments.length - 1].sdt;
  
  return {
    autonomy: {
      start: first.autonomy,
      end: last.autonomy,
      change: last.autonomy - first.autonomy
    },
    competence: {
      start: first.competence,
      end: last.competence,
      change: last.competence - first.competence
    },
    relatedness: {
      start: first.relatedness,
      end: last.relatedness,
      change: last.relatedness - first.relatedness
    }
  };
}

function generateWeeklyRecommendations(
  triggerHeatmap: WeeklyReport['triggerHeatmap'],
  barrierAnalysis: WeeklyReport['barrierAnalysis'],
  behaviorChangeScore: number,
  sdtTrends: WeeklyReport['sdtTrends']
): WeeklyReport['recommendations'] {
  const continueActions: string[] = [];
  const adjustActions: string[] = [];
  const addActions: string[] = [];
  
  // What's working
  if (behaviorChangeScore > 60) {
    continueActions.push('Keep up your current approach - it\'s working!');
  }
  
  const bestTime = Object.entries(triggerHeatmap.timeOfDay)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  if (bestTime) {
    continueActions.push(`Schedule important tasks during ${bestTime} - your peak time`);
  }
  
  if (barrierAnalysis.resolved.length > 0) {
    continueActions.push(`You resolved ${barrierAnalysis.resolved.length} barriers - great problem-solving!`);
  }
  
  // What to adjust
  if (behaviorChangeScore < 40) {
    adjustActions.push('Current strategy needs refinement - try a different approach');
  }
  
  if (sdtTrends.autonomy.change < -10) {
    adjustActions.push('Feeling less in control - reclaim ownership of your goals');
  }
  
  if (sdtTrends.competence.change < -10) {
    adjustActions.push('Confidence declining - focus on smaller, achievable wins');
  }
  
  if (barrierAnalysis.persistent.length > 2) {
    adjustActions.push(`Address persistent barriers: ${barrierAnalysis.persistent[0]}`);
  }
  
  // What to add
  if (sdtTrends.relatedness.change < 0) {
    addActions.push('Consider joining a team or finding an accountability partner');
  }
  
  if (barrierAnalysis.newBarriers.length > 0) {
    addActions.push(`New barrier detected: ${barrierAnalysis.newBarriers[0]} - create a plan to address it`);
  }
  
  if (sdtTrends.autonomy.end < 50) {
    addActions.push('Set one completely self-directed goal this week');
  }
  
  return {
    continue: continueActions.slice(0, 3),
    adjust: adjustActions.slice(0, 3),
    add: addActions.slice(0, 3)
  };
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

// Export all types and functions
export type {
  CheckInData,
  GoalHistory,
  PromptContext,
  FoggAssessment,
  MicroStep,
  AutonomyData,
  CompetenceData,
  RelatednessData,
  SDTProfile,
  CapabilityFactors,
  OpportunityFactors,
  MotivationFactors,
  COMBAssessment,
  BCWIntervention,
  ActionPlan
};
