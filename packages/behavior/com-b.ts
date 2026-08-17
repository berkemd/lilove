/**
 * COM-B Model & Behavior Change Wheel (BCW)
 * 
 * COM-B identifies three conditions necessary for behavior:
 * - Capability (Physical & Psychological)
 * - Opportunity (Social & Physical)
 * - Motivation (Reflective & Automatic)
 * 
 * The Behavior Change Wheel uses COM-B to select appropriate interventions
 * 
 * Reference: Michie, S., van Stralen, M. M., & West, R. (2011). The behaviour change wheel: 
 * A new method for characterising and designing behaviour change interventions.
 */

export interface COMBAssessment {
  capability: {
    physical: BarrierItem[];
    psychological: BarrierItem[];
    score: number; // 0-100
  };
  opportunity: {
    social: BarrierItem[];
    physical: BarrierItem[];
    score: number; // 0-100
  };
  motivation: {
    reflective: BarrierItem[];
    automatic: BarrierItem[];
    score: number; // 0-100
  };
  overallReadiness: number; // 0-100
  criticalBarriers: BarrierItem[];
}

export interface BarrierItem {
  type: 'physical' | 'psychological' | 'social' | 'physical_env' | 'reflective' | 'automatic';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number; // 0-10
  addressable: boolean;
}

export interface BCWIntervention {
  type: 'education' | 'persuasion' | 'incentivization' | 'coercion' | 'training' | 
        'restriction' | 'environmental_restructuring' | 'modeling' | 'enablement';
  description: string;
  targetBarrier: string;
  comTarget: 'capability' | 'opportunity' | 'motivation';
  effectiveness: number; // 0-10 estimated
  effort: 'low' | 'medium' | 'high';
}

export interface ActionPlan {
  immediate: Action[];
  shortTerm: Action[]; // 1-2 weeks
  longTerm: Action[]; // 1+ months
  supportNeeded: string[];
}

export interface Action {
  action: string;
  interventionType: BCWIntervention['type'];
  targetBarrier: string;
  estimatedTime: number; // minutes
  priority: 'high' | 'medium' | 'low';
}

export interface CapabilityFactors {
  physical: {
    healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
    energyLevel: number; // 1-10
    physicalLimitations: string[];
    sleepQuality: number; // 1-10
  };
  psychological: {
    knowledgeLevel: number; // 0-10 for goal domain
    cognitiveLoad: number; // 0-10, higher = more stressed
    attentionCapacity: number; // 0-10
    skillsRequired: string[];
    skillsPresent: string[];
  };
}

export interface OpportunityFactors {
  social: {
    supportNetwork: number; // 0-10
    peerInfluence: 'positive' | 'neutral' | 'negative';
    culturalNorms: 'supportive' | 'neutral' | 'opposing';
    accountability: boolean;
  };
  physical: {
    accessToResources: number; // 0-10
    environmentalCues: 'helpful' | 'neutral' | 'distracting';
    timeAvailability: number; // hours per week
    financialResources: number; // 0-10
  };
}

export interface MotivationFactors {
  reflective: {
    beliefInGoal: number; // 0-10
    identityAlignment: number; // 0-10, goal fits self-concept
    outcomeExpectancy: number; // 0-10, expect to succeed
    valueAlignment: number; // 0-10, goal matches values
  };
  automatic: {
    habits: string[]; // existing habits that help/hinder
    emotionalResponse: 'positive' | 'neutral' | 'negative';
    pastExperiences: 'successful' | 'mixed' | 'unsuccessful';
    immediateRewards: number; // 0-10
  };
}

/**
 * Assess Capability barriers
 * 
 * Identifies physical and psychological barriers to behavior
 */
export function assessCapability(factors: CapabilityFactors): {
  barriers: BarrierItem[];
  score: number;
} {
  const barriers: BarrierItem[] = [];
  let totalImpact = 0;
  let barrierCount = 0;

  // Physical capability assessment
  const { physical, psychological } = factors;

  if (physical.healthStatus === 'poor' || physical.healthStatus === 'fair') {
    const impact = physical.healthStatus === 'poor' ? 8 : 5;
    barriers.push({
      type: 'physical',
      description: `Health status (${physical.healthStatus}) may limit physical capability`,
      severity: physical.healthStatus === 'poor' ? 'high' : 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  if (physical.energyLevel < 5) {
    const impact = 10 - physical.energyLevel;
    barriers.push({
      type: 'physical',
      description: 'Low energy levels affecting ability to act',
      severity: physical.energyLevel < 3 ? 'critical' : 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  if (physical.sleepQuality < 5) {
    barriers.push({
      type: 'physical',
      description: 'Poor sleep quality reducing cognitive and physical capacity',
      severity: physical.sleepQuality < 3 ? 'high' : 'medium',
      impact: 10 - physical.sleepQuality,
      addressable: true
    });
    totalImpact += (10 - physical.sleepQuality);
    barrierCount++;
  }

  if (physical.physicalLimitations.length > 0) {
    barriers.push({
      type: 'physical',
      description: `Physical limitations: ${physical.physicalLimitations.join(', ')}`,
      severity: 'medium',
      impact: Math.min(physical.physicalLimitations.length * 2, 7),
      addressable: false // often need workarounds
    });
    totalImpact += Math.min(physical.physicalLimitations.length * 2, 7);
    barrierCount++;
  }

  // Psychological capability assessment
  if (psychological.knowledgeLevel < 5) {
    const impact = 10 - psychological.knowledgeLevel;
    barriers.push({
      type: 'psychological',
      description: 'Insufficient knowledge or understanding of how to achieve goal',
      severity: psychological.knowledgeLevel < 3 ? 'high' : 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  if (psychological.cognitiveLoad > 7) {
    barriers.push({
      type: 'psychological',
      description: 'High mental load/stress limiting focus and decision-making',
      severity: 'high',
      impact: psychological.cognitiveLoad,
      addressable: true
    });
    totalImpact += psychological.cognitiveLoad;
    barrierCount++;
  }

  if (psychological.attentionCapacity < 5) {
    barriers.push({
      type: 'psychological',
      description: 'Limited attention capacity affecting sustained effort',
      severity: 'medium',
      impact: 10 - psychological.attentionCapacity,
      addressable: true
    });
    totalImpact += (10 - psychological.attentionCapacity);
    barrierCount++;
  }

  const missingSkills = psychological.skillsRequired.filter(
    skill => !psychological.skillsPresent.includes(skill)
  );
  if (missingSkills.length > 0) {
    const impact = Math.min(missingSkills.length * 3, 9);
    barriers.push({
      type: 'psychological',
      description: `Missing skills: ${missingSkills.join(', ')}`,
      severity: missingSkills.length > 2 ? 'high' : 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  // Calculate score (100 = no barriers, 0 = maximum barriers)
  const averageImpact = barrierCount > 0 ? totalImpact / barrierCount : 0;
  const score = Math.max(0, Math.round(100 - (averageImpact * 10)));

  return { barriers, score };
}

/**
 * Assess Opportunity barriers
 * 
 * Identifies social and physical environmental barriers
 */
export function assessOpportunity(factors: OpportunityFactors): {
  barriers: BarrierItem[];
  score: number;
} {
  const barriers: BarrierItem[] = [];
  let totalImpact = 0;
  let barrierCount = 0;

  const { social, physical } = factors;

  // Social opportunity assessment
  if (social.supportNetwork < 5) {
    const impact = 10 - social.supportNetwork;
    barriers.push({
      type: 'social',
      description: 'Weak support network limiting social reinforcement',
      severity: social.supportNetwork < 3 ? 'high' : 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  if (social.peerInfluence === 'negative') {
    barriers.push({
      type: 'social',
      description: 'Negative peer influence working against goal',
      severity: 'high',
      impact: 8,
      addressable: true
    });
    totalImpact += 8;
    barrierCount++;
  }

  if (social.culturalNorms === 'opposing') {
    barriers.push({
      type: 'social',
      description: 'Cultural or social norms oppose desired behavior',
      severity: 'high',
      impact: 7,
      addressable: false // harder to change culture
    });
    totalImpact += 7;
    barrierCount++;
  }

  if (!social.accountability) {
    barriers.push({
      type: 'social',
      description: 'No accountability structure in place',
      severity: 'medium',
      impact: 5,
      addressable: true
    });
    totalImpact += 5;
    barrierCount++;
  }

  // Physical environment assessment
  if (physical.accessToResources < 5) {
    const impact = 10 - physical.accessToResources;
    barriers.push({
      type: 'physical_env',
      description: 'Limited access to necessary resources or tools',
      severity: physical.accessToResources < 3 ? 'critical' : 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  if (physical.environmentalCues === 'distracting') {
    barriers.push({
      type: 'physical_env',
      description: 'Environmental cues working against desired behavior',
      severity: 'medium',
      impact: 6,
      addressable: true
    });
    totalImpact += 6;
    barrierCount++;
  }

  if (physical.timeAvailability < 3) {
    barriers.push({
      type: 'physical_env',
      description: 'Insufficient time available for goal pursuit',
      severity: 'high',
      impact: 8,
      addressable: true
    });
    totalImpact += 8;
    barrierCount++;
  }

  if (physical.financialResources < 5) {
    const impact = 10 - physical.financialResources;
    barriers.push({
      type: 'physical_env',
      description: 'Financial constraints limiting options',
      severity: physical.financialResources < 3 ? 'high' : 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  const averageImpact = barrierCount > 0 ? totalImpact / barrierCount : 0;
  const score = Math.max(0, Math.round(100 - (averageImpact * 10)));

  return { barriers, score };
}

/**
 * Assess Motivation barriers
 * 
 * Identifies reflective (conscious) and automatic (unconscious) motivation barriers
 */
export function assessMotivation(factors: MotivationFactors): {
  barriers: BarrierItem[];
  score: number;
} {
  const barriers: BarrierItem[] = [];
  let totalImpact = 0;
  let barrierCount = 0;

  const { reflective, automatic } = factors;

  // Reflective motivation assessment
  if (reflective.beliefInGoal < 5) {
    const impact = 10 - reflective.beliefInGoal;
    barriers.push({
      type: 'reflective',
      description: 'Low belief that goal is worthwhile or achievable',
      severity: reflective.beliefInGoal < 3 ? 'critical' : 'high',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  if (reflective.identityAlignment < 5) {
    const impact = 10 - reflective.identityAlignment;
    barriers.push({
      type: 'reflective',
      description: 'Goal doesn\'t align with self-concept or identity',
      severity: 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  if (reflective.outcomeExpectancy < 5) {
    const impact = 10 - reflective.outcomeExpectancy;
    barriers.push({
      type: 'reflective',
      description: 'Low expectation of success or positive outcomes',
      severity: reflective.outcomeExpectancy < 3 ? 'high' : 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  if (reflective.valueAlignment < 5) {
    const impact = 10 - reflective.valueAlignment;
    barriers.push({
      type: 'reflective',
      description: 'Goal conflicts with core values',
      severity: 'high',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  // Automatic motivation assessment
  if (automatic.emotionalResponse === 'negative') {
    barriers.push({
      type: 'automatic',
      description: 'Negative emotional associations with goal or actions',
      severity: 'high',
      impact: 8,
      addressable: true
    });
    totalImpact += 8;
    barrierCount++;
  }

  if (automatic.pastExperiences === 'unsuccessful') {
    barriers.push({
      type: 'automatic',
      description: 'Past failures creating automatic avoidance response',
      severity: 'high',
      impact: 7,
      addressable: true
    });
    totalImpact += 7;
    barrierCount++;
  }

  if (automatic.immediateRewards < 5) {
    const impact = 10 - automatic.immediateRewards;
    barriers.push({
      type: 'automatic',
      description: 'Lack of immediate gratification or rewards',
      severity: 'medium',
      impact,
      addressable: true
    });
    totalImpact += impact;
    barrierCount++;
  }

  // Check for conflicting habits
  const hinderingHabits = automatic.habits.filter(h => h.includes('hinder') || h.includes('block'));
  if (hinderingHabits.length > 0) {
    barriers.push({
      type: 'automatic',
      description: `Conflicting habits: ${hinderingHabits.join(', ')}`,
      severity: 'medium',
      impact: Math.min(hinderingHabits.length * 3, 8),
      addressable: true
    });
    totalImpact += Math.min(hinderingHabits.length * 3, 8);
    barrierCount++;
  }

  const averageImpact = barrierCount > 0 ? totalImpact / barrierCount : 0;
  const score = Math.max(0, Math.round(100 - (averageImpact * 10)));

  return { barriers, score };
}

/**
 * Identify critical barriers through COM-B analysis
 * 
 * Root cause analysis to find the most impactful barriers
 */
export function identifyBarriers(
  capability: ReturnType<typeof assessCapability>,
  opportunity: ReturnType<typeof assessOpportunity>,
  motivation: ReturnType<typeof assessMotivation>
): COMBAssessment {
  const allBarriers = [
    ...capability.barriers.map(b => ({ ...b, component: 'capability' as const })),
    ...opportunity.barriers.map(b => ({ ...b, component: 'opportunity' as const })),
    ...motivation.barriers.map(b => ({ ...b, component: 'motivation' as const }))
  ];

  // Identify critical barriers (high/critical severity OR high impact)
  const criticalBarriers = allBarriers
    .filter(b => 
      b.severity === 'critical' || 
      b.severity === 'high' || 
      b.impact >= 7
    )
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5); // Top 5 critical barriers

  // Overall readiness score (weighted average)
  const overallReadiness = Math.round(
    (capability.score * 0.35) + 
    (opportunity.score * 0.30) + 
    (motivation.score * 0.35)
  );

  return {
    capability: {
      physical: capability.barriers.filter(b => b.type === 'physical'),
      psychological: capability.barriers.filter(b => b.type === 'psychological'),
      score: capability.score
    },
    opportunity: {
      social: opportunity.barriers.filter(b => b.type === 'social'),
      physical: opportunity.barriers.filter(b => b.type === 'physical_env'),
      score: opportunity.score
    },
    motivation: {
      reflective: motivation.barriers.filter(b => b.type === 'reflective'),
      automatic: motivation.barriers.filter(b => b.type === 'automatic'),
      score: motivation.score
    },
    overallReadiness,
    criticalBarriers
  };
}

/**
 * Select BCW interventions based on barriers
 * 
 * Maps barriers to evidence-based intervention functions
 */
export function selectInterventions(assessment: COMBAssessment): BCWIntervention[] {
  const interventions: BCWIntervention[] = [];

  // Address critical barriers first
  for (const barrier of assessment.criticalBarriers) {
    const barrierInterventions = mapBarrierToIntervention(barrier);
    interventions.push(...barrierInterventions);
  }

  // Remove duplicates and sort by effectiveness
  const uniqueInterventions = interventions.filter((intervention, index, self) =>
    index === self.findIndex(i => i.type === intervention.type && i.targetBarrier === intervention.targetBarrier)
  );

  return uniqueInterventions
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 8); // Top 8 interventions
}

/**
 * Map specific barrier to appropriate BCW intervention
 */
function mapBarrierToIntervention(barrier: BarrierItem & { component?: string }): BCWIntervention[] {
  const interventions: BCWIntervention[] = [];

  switch (barrier.type) {
    case 'psychological':
      if (barrier.description.includes('knowledge') || barrier.description.includes('skills')) {
        interventions.push({
          type: 'education',
          description: 'Provide knowledge and information about how to achieve the goal',
          targetBarrier: barrier.description,
          comTarget: 'capability',
          effectiveness: 8,
          effort: 'low'
        });
        interventions.push({
          type: 'training',
          description: 'Skill-building exercises and practice opportunities',
          targetBarrier: barrier.description,
          comTarget: 'capability',
          effectiveness: 9,
          effort: 'medium'
        });
      }
      if (barrier.description.includes('cognitive') || barrier.description.includes('attention')) {
        interventions.push({
          type: 'enablement',
          description: 'Reduce cognitive load through simplification and support tools',
          targetBarrier: barrier.description,
          comTarget: 'capability',
          effectiveness: 7,
          effort: 'low'
        });
      }
      break;

    case 'physical':
      interventions.push({
        type: 'enablement',
        description: 'Provide resources or reduce barriers to increase physical capability',
        targetBarrier: barrier.description,
        comTarget: 'capability',
        effectiveness: 7,
        effort: 'medium'
      });
      break;

    case 'social':
      interventions.push({
        type: 'modeling',
        description: 'Provide positive role models and social proof',
        targetBarrier: barrier.description,
        comTarget: 'opportunity',
        effectiveness: 7,
        effort: 'low'
      });
      if (barrier.description.includes('support') || barrier.description.includes('accountability')) {
        interventions.push({
          type: 'enablement',
          description: 'Create social support structures and accountability systems',
          targetBarrier: barrier.description,
          comTarget: 'opportunity',
          effectiveness: 8,
          effort: 'medium'
        });
      }
      break;

    case 'physical_env':
      interventions.push({
        type: 'environmental_restructuring',
        description: 'Modify physical environment to support desired behavior',
        targetBarrier: barrier.description,
        comTarget: 'opportunity',
        effectiveness: 9,
        effort: 'medium'
      });
      break;

    case 'reflective':
      interventions.push({
        type: 'persuasion',
        description: 'Use communication to induce positive feelings and stimulate action',
        targetBarrier: barrier.description,
        comTarget: 'motivation',
        effectiveness: 6,
        effort: 'low'
      });
      if (barrier.description.includes('belief') || barrier.description.includes('value')) {
        interventions.push({
          type: 'education',
          description: 'Increase understanding of why the goal matters',
          targetBarrier: barrier.description,
          comTarget: 'motivation',
          effectiveness: 7,
          effort: 'low'
        });
      }
      break;

    case 'automatic':
      interventions.push({
        type: 'training',
        description: 'Repeated practice to form new automatic responses',
        targetBarrier: barrier.description,
        comTarget: 'motivation',
        effectiveness: 8,
        effort: 'high'
      });
      if (barrier.description.includes('reward')) {
        interventions.push({
          type: 'incentivization',
          description: 'Create expectation of reward or immediate positive feedback',
          targetBarrier: barrier.description,
          comTarget: 'motivation',
          effectiveness: 7,
          effort: 'low'
        });
      }
      break;
  }

  return interventions;
}

/**
 * Generate actionable plan from selected interventions
 */
export function generateActionPlan(interventions: BCWIntervention[]): ActionPlan {
  const immediate: Action[] = [];
  const shortTerm: Action[] = [];
  const longTerm: Action[] = [];
  const supportNeeded: string[] = [];

  for (const intervention of interventions) {
    const actions = interventionToActions(intervention);
    
    // Categorize by effort and effectiveness
    if (intervention.effort === 'low' && intervention.effectiveness >= 7) {
      immediate.push(...actions.map(a => ({ ...a, priority: 'high' as const })));
    } else if (intervention.effort === 'medium') {
      shortTerm.push(...actions.map(a => ({ ...a, priority: 'medium' as const })));
    } else {
      longTerm.push(...actions.map(a => ({ ...a, priority: 'low' as const })));
    }

    // Identify support needs
    if (intervention.type === 'modeling' || intervention.type === 'enablement') {
      supportNeeded.push(`May need: ${intervention.description}`);
    }
  }

  return {
    immediate: immediate.slice(0, 3),
    shortTerm: shortTerm.slice(0, 5),
    longTerm: longTerm.slice(0, 3),
    supportNeeded
  };
}

/**
 * Convert intervention to specific actions
 */
function interventionToActions(intervention: BCWIntervention): Omit<Action, 'priority'>[] {
  const actions: Omit<Action, 'priority'>[] = [];

  switch (intervention.type) {
    case 'education':
      actions.push({
        action: 'Research and learn about the skills/knowledge needed for this goal',
        interventionType: 'education',
        targetBarrier: intervention.targetBarrier,
        estimatedTime: 30
      });
      break;

    case 'training':
      actions.push({
        action: 'Practice the required skills in small, focused sessions',
        interventionType: 'training',
        targetBarrier: intervention.targetBarrier,
        estimatedTime: 45
      });
      break;

    case 'enablement':
      actions.push({
        action: 'Identify and acquire tools/resources that make this easier',
        interventionType: 'enablement',
        targetBarrier: intervention.targetBarrier,
        estimatedTime: 20
      });
      break;

    case 'environmental_restructuring':
      actions.push({
        action: 'Reorganize your environment to make the desired behavior easier',
        interventionType: 'environmental_restructuring',
        targetBarrier: intervention.targetBarrier,
        estimatedTime: 60
      });
      break;

    case 'persuasion':
      actions.push({
        action: 'Write down your "why" - the deeper reasons this goal matters',
        interventionType: 'persuasion',
        targetBarrier: intervention.targetBarrier,
        estimatedTime: 15
      });
      break;

    case 'incentivization':
      actions.push({
        action: 'Set up a reward system for progress milestones',
        interventionType: 'incentivization',
        targetBarrier: intervention.targetBarrier,
        estimatedTime: 10
      });
      break;

    case 'modeling':
      actions.push({
        action: 'Find someone who has achieved this goal and learn their approach',
        interventionType: 'modeling',
        targetBarrier: intervention.targetBarrier,
        estimatedTime: 30
      });
      break;
  }

  return actions;
}
