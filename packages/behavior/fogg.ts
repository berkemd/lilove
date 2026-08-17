/**
 * Fogg Behavior Model (B=MAP)
 * 
 * B = MAP (Behavior = Motivation × Ability × Prompt)
 * 
 * Reference: Fogg, B. J. (2009). A behavior model for persuasive design.
 * Proceedings of the 4th International Conference on Persuasive Technology.
 */

export interface FoggAssessment {
  motivation: number; // 0-100
  ability: number; // 0-100
  promptType: string;
  behaviorScore: number; // B=MAP score
  recommendations: string[];
}

export interface MicroStep {
  step: string;
  difficulty: 'tiny' | 'small' | 'medium';
  estimatedTime: number; // minutes
  trigger: string;
}

export interface CheckInData {
  completedTasks: number;
  missedTasks: number;
  streakDays: number;
  lastCheckIn: Date;
}

export interface GoalHistory {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  averageCompletionRate: number;
  category: string;
}

export interface PromptContext {
  timeOfDay: string; // morning, afternoon, evening, night
  location?: string;
  previousTaskCompleted: boolean;
  dayOfWeek: string;
  energyLevel?: number; // 1-5
}

/**
 * Calculate user motivation based on check-ins and goal history
 * 
 * Factors:
 * - Recent completion rate (40%)
 * - Streak consistency (30%)
 * - Historical success rate (20%)
 * - Recent engagement (10%)
 */
export function calculateMotivation(
  checkIns: CheckInData,
  goalHistory: GoalHistory
): number {
  // Recent completion rate (0-40 points)
  const totalRecent = checkIns.completedTasks + checkIns.missedTasks;
  const recentRate = totalRecent > 0 
    ? (checkIns.completedTasks / totalRecent) * 40 
    : 20; // neutral if no data

  // Streak consistency (0-30 points)
  const streakScore = Math.min(checkIns.streakDays * 3, 30);

  // Historical success (0-20 points)
  const historicalScore = goalHistory.averageCompletionRate * 20;

  // Recent engagement (0-10 points)
  const daysSinceCheckIn = Math.floor(
    (Date.now() - checkIns.lastCheckIn.getTime()) / (1000 * 60 * 60 * 24)
  );
  const engagementScore = Math.max(10 - daysSinceCheckIn * 2, 0);

  const motivation = Math.min(
    Math.round(recentRate + streakScore + historicalScore + engagementScore),
    100
  );

  return motivation;
}

/**
 * Calculate user ability based on goal complexity and available resources
 * 
 * Factors:
 * - Goal simplicity (40%)
 * - Time availability (30%)
 * - Skill/resource match (20%)
 * - Previous experience (10%)
 */
export function calculateAbility(
  goal: {
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedDuration?: number; // days
    category: string;
    requiredSkills?: string[];
  },
  userResources: {
    availableTimePerDay: number; // minutes
    completedInCategory: number;
    skills: string[];
    supportNetwork: number; // 0-10
  }
): number {
  // Goal simplicity (0-40 points)
  const complexityScore = {
    simple: 40,
    moderate: 25,
    complex: 10
  }[goal.complexity];

  // Time availability (0-30 points)
  const requiredTimePerDay = goal.estimatedDuration 
    ? Math.min((goal.estimatedDuration * 30) / 60, 60) // rough estimate
    : 30;
  const timeScore = userResources.availableTimePerDay >= requiredTimePerDay 
    ? 30 
    : (userResources.availableTimePerDay / requiredTimePerDay) * 30;

  // Skill match (0-20 points)
  const requiredSkills = goal.requiredSkills || [];
  const matchedSkills = requiredSkills.filter(skill => 
    userResources.skills.includes(skill)
  ).length;
  const skillScore = requiredSkills.length > 0
    ? (matchedSkills / requiredSkills.length) * 20
    : 20; // assume capable if no skills required

  // Experience (0-10 points)
  const experienceScore = Math.min(userResources.completedInCategory * 2, 10);

  const ability = Math.min(
    Math.round(complexityScore + timeScore + skillScore + experienceScore),
    100
  );

  return ability;
}

/**
 * Identify optimal prompt triggers based on context
 * 
 * Returns recommended trigger types and timing
 */
export function identifyPromptTriggers(
  context: PromptContext,
  userHistory: {
    mostProductiveTime: string;
    preferredPromptType: string;
    responseRate: { [key: string]: number };
  }
): {
  primaryTrigger: string;
  backupTrigger: string;
  timing: string;
  message: string;
} {
  const { timeOfDay, previousTaskCompleted, dayOfWeek } = context;

  // Determine trigger type based on context and history
  let primaryTrigger = 'notification';
  let timing = timeOfDay;
  let message = '';

  // Time-based trigger optimization
  if (userHistory.mostProductiveTime === timeOfDay) {
    primaryTrigger = 'spark'; // Facilitator (natural moment)
    message = "Perfect timing! You're usually most productive now.";
  } else if (previousTaskCompleted) {
    primaryTrigger = 'facilitator'; // Chain with previous success
    message = "Great job! Ready for the next step?";
  } else if (['monday', 'friday'].includes(dayOfWeek.toLowerCase())) {
    primaryTrigger = 'signal'; // External reminder
    message = "Weekly check-in: Let's review your progress.";
  }

  // Backup based on response rates
  const backupTrigger = Object.entries(userHistory.responseRate)
    .sort(([, a], [, b]) => b - a)[1]?.[0] || 'notification';

  return {
    primaryTrigger,
    backupTrigger,
    timing,
    message
  };
}

/**
 * Calculate B=MAP Behavior Score
 * 
 * B = Motivation × Ability × Prompt (normalized to 0-100)
 * 
 * High score (>60) = Likely to perform behavior
 * Medium score (30-60) = May need support
 * Low score (<30) = Unlikely without intervention
 */
export function getBehaviorScore(
  motivation: number,
  ability: number,
  promptEffectiveness: number = 80 // default prompt strength
): number {
  // Normalize: (M/100) × (A/100) × (P/100) × 100
  const score = (motivation * ability * promptEffectiveness) / 10000;
  return Math.round(Math.min(score, 100));
}

/**
 * Generate micro-steps (tiny habits) based on ability score
 * 
 * Lower ability = smaller, easier steps
 * Higher ability = can handle larger steps
 */
export function generateMicroSteps(
  goal: {
    title: string;
    description?: string;
    category: string;
  },
  abilityScore: number,
  motivation: number
): MicroStep[] {
  const steps: MicroStep[] = [];

  // Determine step size based on ability
  const stepSize: 'tiny' | 'small' | 'medium' = 
    abilityScore < 40 ? 'tiny' :
    abilityScore < 70 ? 'small' : 'medium';

  // Base micro-steps for any goal
  const tinySteps = [
    {
      step: `Write down why "${goal.title}" matters to you`,
      difficulty: 'tiny' as const,
      estimatedTime: 2,
      trigger: 'after_morning_coffee'
    },
    {
      step: `Identify the smallest possible first action for "${goal.title}"`,
      difficulty: 'tiny' as const,
      estimatedTime: 3,
      trigger: 'when_you_sit_at_desk'
    },
    {
      step: `Set a 5-minute timer and work on "${goal.title}"`,
      difficulty: 'small' as const,
      estimatedTime: 5,
      trigger: 'after_lunch'
    }
  ];

  const smallSteps = [
    {
      step: `Break "${goal.title}" into 3 mini-milestones`,
      difficulty: 'small' as const,
      estimatedTime: 10,
      trigger: 'morning_planning'
    },
    {
      step: `Complete the easiest part of "${goal.title}"`,
      difficulty: 'small' as const,
      estimatedTime: 15,
      trigger: 'peak_energy_time'
    },
    {
      step: `Share your progress on "${goal.title}" with someone`,
      difficulty: 'small' as const,
      estimatedTime: 5,
      trigger: 'after_completing_task'
    }
  ];

  const mediumSteps = [
    {
      step: `Dedicate 30 minutes to focused work on "${goal.title}"`,
      difficulty: 'medium' as const,
      estimatedTime: 30,
      trigger: 'morning_deep_work'
    },
    {
      step: `Complete one full milestone of "${goal.title}"`,
      difficulty: 'medium' as const,
      estimatedTime: 45,
      trigger: 'scheduled_block'
    },
    {
      step: `Review and adjust your approach to "${goal.title}"`,
      difficulty: 'medium' as const,
      estimatedTime: 20,
      trigger: 'weekly_review'
    }
  ];

  // Select appropriate steps based on ability
  if (stepSize === 'tiny') {
    steps.push(...tinySteps.slice(0, 2));
  } else if (stepSize === 'small') {
    steps.push(tinySteps[0], ...smallSteps.slice(0, 2));
  } else {
    steps.push(...smallSteps.slice(0, 1), ...mediumSteps.slice(0, 2));
  }

  // Add motivation-based bonus step if high motivation
  if (motivation > 70) {
    steps.push({
      step: `Celebrate your progress on "${goal.title}" - you've earned it!`,
      difficulty: 'tiny',
      estimatedTime: 2,
      trigger: 'after_any_completion'
    });
  }

  return steps;
}

/**
 * Complete Fogg assessment for a user and goal
 */
export function assessFoggModel(
  checkIns: CheckInData,
  goalHistory: GoalHistory,
  goal: any,
  userResources: any,
  context: PromptContext,
  userHistory: any
): FoggAssessment {
  const motivation = calculateMotivation(checkIns, goalHistory);
  const ability = calculateAbility(goal, userResources);
  const triggers = identifyPromptTriggers(context, userHistory);
  const behaviorScore = getBehaviorScore(motivation, ability);

  const recommendations: string[] = [];

  // Generate recommendations based on scores
  if (motivation < 50) {
    recommendations.push('Boost motivation: Connect this goal to your deeper values');
    recommendations.push('Find an accountability partner or join a community');
  }

  if (ability < 50) {
    recommendations.push('Simplify the goal: Break it into smaller, manageable steps');
    recommendations.push('Increase resources: Allocate more time or gather needed tools');
  }

  if (behaviorScore < 40) {
    recommendations.push('Use the Fogg Behavior Model: Focus on tiny habits first');
    recommendations.push(`Optimal trigger: ${triggers.message}`);
  } else if (behaviorScore >= 70) {
    recommendations.push('High success probability! Set up your environment for success');
    recommendations.push('Schedule specific time blocks to capitalize on your readiness');
  }

  return {
    motivation,
    ability,
    promptType: triggers.primaryTrigger,
    behaviorScore,
    recommendations
  };
}
