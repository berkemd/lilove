/**
 * Self-Determination Theory (SDT)
 * 
 * SDT posits that human motivation and well-being depend on three basic psychological needs:
 * 1. Autonomy - feeling in control of one's actions
 * 2. Competence - feeling effective and capable
 * 3. Relatedness - feeling connected to others
 * 
 * Reference: Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the 
 * facilitation of intrinsic motivation, social development, and well-being.
 */

export interface SDTProfile {
  autonomy: number; // 0-100
  competence: number; // 0-100
  relatedness: number; // 0-100
  overallWellbeing: number; // 0-100
  motivationType: 'intrinsic' | 'extrinsic' | 'amotivated' | 'balanced';
  strengths: string[];
  weaknesses: string[];
}

export interface AutonomyData {
  userChoices: {
    selfSetGoals: number; // count of user-initiated goals
    totalGoals: number;
    customizedSettings: boolean;
    declinedSuggestions: number; // user autonomy indicator
  };
  controlLevel: {
    canModifyGoals: boolean;
    canSetOwnSchedule: boolean;
    hasVetoRights: boolean; // can reject AI suggestions
    flexibilityScore: number; // 0-10
  };
}

export interface CompetenceData {
  achievements: {
    total: number;
    recent: number; // last 30 days
    categories: { [key: string]: number };
  };
  progressRate: {
    goalsCompleted: number;
    goalsActive: number;
    averageCompletionTime: number; // days
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  skillDevelopment: {
    newSkillsLearned: number;
    masteryLevel: { [skill: string]: number }; // 0-100
  };
}

export interface RelatednessData {
  teamActivity: {
    teamsJoined: number;
    teamGoalsShared: number;
    collaborationFrequency: number; // interactions per week
    supportGiven: number;
    supportReceived: number;
  };
  communityEngagement: {
    friendsCount: number;
    activeFriends: number; // interacted in last 30 days
    challengesJoined: number;
    socialPosts: number;
    commentsReceived: number;
  };
  socialSupport: {
    mentorshipActive: boolean;
    peerSupportScore: number; // 0-10
    feelingOfBelonging: number; // 0-10, self-reported
  };
}

/**
 * Assess Autonomy - User's sense of control and self-direction
 * 
 * Factors:
 * - Self-initiated goals (40%)
 * - Customization freedom (30%)
 * - Rejection of suggestions (shows agency) (20%)
 * - Flexibility in approach (10%)
 */
export function assessAutonomy(data: AutonomyData): number {
  const { userChoices, controlLevel } = data;

  // Self-initiated goals (0-40 points)
  const selfDirectionScore = userChoices.totalGoals > 0
    ? (userChoices.selfSetGoals / userChoices.totalGoals) * 40
    : 0;

  // Customization (0-30 points)
  let customizationScore = 0;
  if (controlLevel.canModifyGoals) customizationScore += 10;
  if (controlLevel.canSetOwnSchedule) customizationScore += 10;
  if (userChoices.customizedSettings) customizationScore += 10;

  // Agency expression (0-20 points)
  // Users who decline suggestions show they're thinking independently
  const agencyScore = Math.min(userChoices.declinedSuggestions * 4, 20);

  // Flexibility (0-10 points)
  const flexibilityScore = controlLevel.flexibilityScore;

  const autonomy = Math.min(
    Math.round(selfDirectionScore + customizationScore + agencyScore + flexibilityScore),
    100
  );

  return autonomy;
}

/**
 * Assess Competence - User's sense of effectiveness and growth
 * 
 * Factors:
 * - Achievement frequency (30%)
 * - Goal completion rate (30%)
 * - Improvement trend (25%)
 * - Skill development (15%)
 */
export function assessCompetence(data: CompetenceData): number {
  const { achievements, progressRate, skillDevelopment } = data;

  // Achievement frequency (0-30 points)
  // Recent achievements weighted more heavily
  const achievementScore = Math.min(
    (achievements.recent * 3) + (achievements.total * 0.5),
    30
  );

  // Completion rate (0-30 points)
  const completionRate = progressRate.goalsActive > 0
    ? progressRate.goalsCompleted / (progressRate.goalsCompleted + progressRate.goalsActive)
    : 0;
  const completionScore = completionRate * 30;

  // Improvement trend (0-25 points)
  const trendScore = {
    improving: 25,
    stable: 15,
    declining: 5
  }[progressRate.improvementTrend];

  // Skill development (0-15 points)
  const skillScore = Math.min(skillDevelopment.newSkillsLearned * 5, 15);

  const competence = Math.min(
    Math.round(achievementScore + completionScore + trendScore + skillScore),
    100
  );

  return competence;
}

/**
 * Assess Relatedness - User's sense of connection and belonging
 * 
 * Factors:
 * - Team participation (35%)
 * - Community engagement (35%)
 * - Social support quality (30%)
 */
export function assessRelatedness(data: RelatednessData): number {
  const { teamActivity, communityEngagement, socialSupport } = data;

  // Team participation (0-35 points)
  let teamScore = 0;
  teamScore += Math.min(teamActivity.teamsJoined * 5, 10);
  teamScore += Math.min(teamActivity.collaborationFrequency * 2, 15);
  teamScore += Math.min((teamActivity.supportGiven + teamActivity.supportReceived) * 2, 10);

  // Community engagement (0-35 points)
  let communityScore = 0;
  const friendEngagementRate = communityEngagement.friendsCount > 0
    ? communityEngagement.activeFriends / communityEngagement.friendsCount
    : 0;
  communityScore += friendEngagementRate * 15;
  communityScore += Math.min(communityEngagement.challengesJoined * 3, 10);
  communityScore += Math.min(communityEngagement.socialPosts * 2, 10);

  // Social support (0-30 points)
  let supportScore = 0;
  if (socialSupport.mentorshipActive) supportScore += 10;
  supportScore += socialSupport.peerSupportScore * 1; // 0-10
  supportScore += socialSupport.feelingOfBelonging * 1; // 0-10

  const relatedness = Math.min(
    Math.round(teamScore + communityScore + supportScore),
    100
  );

  return relatedness;
}

/**
 * Generate comprehensive SDT profile
 */
export function getSDTProfile(
  autonomy: number,
  competence: number,
  relatedness: number
): SDTProfile {
  // Overall wellbeing (weighted average)
  const overallWellbeing = Math.round(
    (autonomy * 0.35) + (competence * 0.35) + (relatedness * 0.30)
  );

  // Determine motivation type
  let motivationType: SDTProfile['motivationType'];
  if (autonomy >= 70 && competence >= 70) {
    motivationType = 'intrinsic'; // High internal motivation
  } else if (autonomy < 40 && relatedness >= 60) {
    motivationType = 'extrinsic'; // External/social motivation
  } else if (autonomy < 40 && competence < 40 && relatedness < 40) {
    motivationType = 'amotivated'; // Low overall motivation
  } else {
    motivationType = 'balanced'; // Mixed motivation sources
  }

  // Identify strengths
  const strengths: string[] = [];
  if (autonomy >= 70) strengths.push('Strong sense of self-direction and control');
  if (competence >= 70) strengths.push('High perceived competence and mastery');
  if (relatedness >= 70) strengths.push('Well-connected with supportive community');
  if (overallWellbeing >= 70) strengths.push('Well-balanced psychological needs');

  // Identify weaknesses
  const weaknesses: string[] = [];
  if (autonomy < 50) weaknesses.push('Limited sense of control over goals and actions');
  if (competence < 50) weaknesses.push('Low confidence in ability to achieve goals');
  if (relatedness < 50) weaknesses.push('Insufficient social connection and support');
  if (overallWellbeing < 50) weaknesses.push('Multiple psychological needs not being met');

  return {
    autonomy,
    competence,
    relatedness,
    overallWellbeing,
    motivationType,
    strengths,
    weaknesses
  };
}

/**
 * Generate motivation interventions based on SDT profile
 * 
 * Interventions target specific needs that are lacking
 */
export function generateMotivationInterventions(
  profile: SDTProfile
): {
  priority: 'high' | 'medium' | 'low';
  interventions: Array<{
    need: 'autonomy' | 'competence' | 'relatedness';
    action: string;
    rationale: string;
    difficulty: 'easy' | 'moderate' | 'challenging';
  }>;
} {
  const interventions: Array<{
    need: 'autonomy' | 'competence' | 'relatedness';
    action: string;
    rationale: string;
    difficulty: 'easy' | 'moderate' | 'challenging';
  }> = [];

  // Determine priority based on overall wellbeing
  const priority: 'high' | 'medium' | 'low' = 
    profile.overallWellbeing < 40 ? 'high' :
    profile.overallWellbeing < 70 ? 'medium' : 'low';

  // Autonomy interventions
  if (profile.autonomy < 50) {
    interventions.push({
      need: 'autonomy',
      action: 'Create one completely self-directed goal this week',
      rationale: 'Choosing your own goals increases intrinsic motivation and sense of control',
      difficulty: 'easy'
    });
    interventions.push({
      need: 'autonomy',
      action: 'Customize your goal approach - reject at least one system suggestion',
      rationale: 'Exercising choice, even by declining, reinforces your autonomy',
      difficulty: 'easy'
    });
  }

  if (profile.autonomy < 70) {
    interventions.push({
      need: 'autonomy',
      action: 'Set your own schedule and deadlines for existing goals',
      rationale: 'Control over timing enhances perceived autonomy and reduces pressure',
      difficulty: 'moderate'
    });
  }

  // Competence interventions
  if (profile.competence < 50) {
    interventions.push({
      need: 'competence',
      action: 'Break your biggest goal into 5 tiny, achievable steps',
      rationale: 'Small wins build confidence and perceived competence',
      difficulty: 'easy'
    });
    interventions.push({
      need: 'competence',
      action: 'Complete one micro-goal today to build momentum',
      rationale: 'Immediate success experiences boost competence beliefs',
      difficulty: 'easy'
    });
  }

  if (profile.competence < 70) {
    interventions.push({
      need: 'competence',
      action: 'Track your progress visually to see your growth',
      rationale: 'Visible progress reinforces competence and motivates continued effort',
      difficulty: 'moderate'
    });
    interventions.push({
      need: 'competence',
      action: 'Reflect on a recent achievement and identify the skills you used',
      rationale: 'Conscious awareness of competence strengthens self-efficacy',
      difficulty: 'easy'
    });
  }

  // Relatedness interventions
  if (profile.relatedness < 50) {
    interventions.push({
      need: 'relatedness',
      action: 'Join one team or challenge to connect with others',
      rationale: 'Shared goals create belonging and mutual support',
      difficulty: 'moderate'
    });
    interventions.push({
      need: 'relatedness',
      action: 'Share your progress with one friend or family member',
      rationale: 'Social sharing strengthens relationships and accountability',
      difficulty: 'easy'
    });
  }

  if (profile.relatedness < 70) {
    interventions.push({
      need: 'relatedness',
      action: 'Offer support or encouragement to someone else working on goals',
      rationale: 'Giving support strengthens social bonds and sense of community',
      difficulty: 'easy'
    });
    interventions.push({
      need: 'relatedness',
      action: 'Find a mentor or accountability partner for your journey',
      rationale: 'One-on-one connections provide deeper relational satisfaction',
      difficulty: 'challenging'
    });
  }

  // Sort by difficulty (easy first) and limit to top 5
  interventions.sort((a, b) => {
    const difficultyOrder = { easy: 0, moderate: 1, challenging: 2 };
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });

  return {
    priority,
    interventions: interventions.slice(0, 5)
  };
}

/**
 * Analyze motivation quality based on SDT
 * 
 * Returns insights about the type and quality of motivation
 */
export function analyzeMotivationQuality(profile: SDTProfile): {
  quality: 'high' | 'medium' | 'low';
  type: string;
  sustainability: 'sustainable' | 'at-risk' | 'unsustainable';
  insights: string[];
} {
  const { autonomy, competence, relatedness, motivationType } = profile;

  // Determine quality
  const avgScore = (autonomy + competence + relatedness) / 3;
  const quality: 'high' | 'medium' | 'low' =
    avgScore >= 70 ? 'high' :
    avgScore >= 50 ? 'medium' : 'low';

  // Determine sustainability
  let sustainability: 'sustainable' | 'at-risk' | 'unsustainable';
  if (motivationType === 'intrinsic' && autonomy >= 60 && competence >= 60) {
    sustainability = 'sustainable';
  } else if (motivationType === 'amotivated' || avgScore < 40) {
    sustainability = 'unsustainable';
  } else {
    sustainability = 'at-risk';
  }

  // Generate insights
  const insights: string[] = [];

  if (motivationType === 'intrinsic') {
    insights.push('Your motivation comes from within - this is the most sustainable type');
    insights.push('You pursue goals because they align with your values and interests');
  } else if (motivationType === 'extrinsic') {
    insights.push('Your motivation is largely driven by external factors like social approval');
    insights.push('Consider connecting goals to your personal values for deeper engagement');
  } else if (motivationType === 'amotivated') {
    insights.push('Low motivation detected across all needs - intervention needed');
    insights.push('Start with tiny goals to rebuild confidence and momentum');
  } else {
    insights.push('Your motivation comes from both internal and external sources');
    insights.push('Strengthen intrinsic motivation by focusing on personally meaningful goals');
  }

  if (sustainability === 'at-risk') {
    insights.push('Your current motivation pattern may be difficult to maintain long-term');
    insights.push('Focus on building autonomy and competence for lasting change');
  }

  return {
    quality,
    type: motivationType,
    sustainability,
    insights
  };
}
