import { 
  Goal, 
  Task, 
  TaskPlan, 
  UserProfile, 
  PerformanceEvent,
  Skill,
  ExpertKnowledge,
  KnowledgeDomain,
  GoalAnalysis,
  TaskGenerationContext,
  PerformanceInsights,
  AdaptationTrigger,
  PredictionModel
} from '@shared/schema';

// ===== LILOVE AI ENGINE =====
// Sophisticated Performance Intelligence System
// No external APIs - Pure algorithmic intelligence

export class GoalIntelligenceEngine {
  
  // ===== GOAL ANALYSIS & PLANNING =====
  
  static analyzeGoal(
    goal: Goal, 
    userProfile: UserProfile,
    existingSkills: Skill[],
    domainKnowledge: ExpertKnowledge[]
  ): GoalAnalysis {
    
    const complexity = this.calculateComplexity(goal, domainKnowledge);
    const skillGaps = this.identifySkillGaps(goal, existingSkills);
    const prerequisites = this.extractPrerequisites(goal, domainKnowledge);
    const estimatedDuration = this.estimateDuration(goal, userProfile, skillGaps);
    const milestones = this.generateMilestones(goal, complexity);
    const riskFactors = this.assessRisks(goal, userProfile, skillGaps);
    
    return {
      complexity,
      estimatedDuration,
      skillGaps,
      prerequisites,
      milestones,
      riskFactors,
      confidenceScore: this.calculateConfidence(goal, userProfile, domainKnowledge)
    };
  }
  
  private static calculateComplexity(goal: Goal, domainKnowledge: ExpertKnowledge[]): number {
    let complexityScore = 5; // Base complexity
    
    // Domain-specific complexity factors
    const domainFactors: Record<string, number> = {
      'tech': 8, 'data_science': 9, 'ai_ml': 10,
      'business': 6, 'marketing': 5, 'design': 6,
      'health': 7, 'finance': 8, 'creative': 4
    };
    
    complexityScore = domainFactors[goal.category] || 5;
    
    // Adjust based on goal description complexity
    const complexWords = [
      'advanced', 'expert', 'senior', 'lead', 'architect', 'enterprise',
      'machine learning', 'artificial intelligence', 'blockchain', 'cloud',
      'full-stack', 'distributed', 'microservices', 'scalable'
    ];
    
    const description = (goal.description || '').toLowerCase();
    const complexWordCount = complexWords.filter(word => description.includes(word)).length;
    complexityScore += Math.min(complexWordCount * 0.5, 3);
    
    // Knowledge depth factor
    const relevantKnowledge = domainKnowledge.filter(k => 
      k.type === 'concept' && k.difficulty && k.difficulty >= 7
    );
    if (relevantKnowledge.length > 10) complexityScore += 1;
    
    return Math.max(1, Math.min(10, Math.round(complexityScore)));
  }
  
  private static identifySkillGaps(goal: Goal, existingSkills: Skill[]): string[] {
    // Intelligent skill extraction from goal
    const requiredSkills = this.extractRequiredSkills(goal);
    const existingSkillNames = existingSkills.map(s => s.name.toLowerCase());
    
    return requiredSkills.filter(skill => 
      !existingSkillNames.some(existing => 
        existing.includes(skill.toLowerCase()) || skill.toLowerCase().includes(existing)
      )
    );
  }
  
  private static extractRequiredSkills(goal: Goal): string[] {
    const skillMap: Record<string, string[]> = {
      'tech': [
        'Programming', 'Algorithms', 'Data Structures', 'System Design',
        'Database Design', 'API Development', 'Testing', 'Version Control'
      ],
      'data_science': [
        'Statistics', 'Python', 'R', 'SQL', 'Machine Learning', 
        'Data Visualization', 'Pandas', 'Numpy', 'Scikit-learn'
      ],
      'ai_ml': [
        'Linear Algebra', 'Calculus', 'Statistics', 'Python', 'TensorFlow',
        'PyTorch', 'Neural Networks', 'Deep Learning', 'NLP', 'Computer Vision'
      ],
      'business': [
        'Strategic Planning', 'Financial Analysis', 'Project Management',
        'Leadership', 'Communication', 'Negotiation', 'Market Research'
      ],
      'design': [
        'Design Principles', 'Color Theory', 'Typography', 'User Research',
        'Prototyping', 'Figma', 'Adobe Creative Suite', 'Design Systems'
      ]
    };
    
    const baseSkills = skillMap[goal.category] || [];
    
    // Extract skills from goal title/description using keyword matching
    const text = `${goal.title} ${goal.description || ''}`.toLowerCase();
    const extractedSkills: string[] = [];
    
    // Technology skills
    const techKeywords = {
      'react': 'React', 'javascript': 'JavaScript', 'typescript': 'TypeScript',
      'python': 'Python', 'java': 'Java', 'go': 'Go Lang', 'rust': 'Rust',
      'docker': 'Docker', 'kubernetes': 'Kubernetes', 'aws': 'AWS',
      'machine learning': 'Machine Learning', 'ai': 'Artificial Intelligence',
      'database': 'Database Design', 'sql': 'SQL', 'mongodb': 'MongoDB'
    };
    
    Object.entries(techKeywords).forEach(([keyword, skill]) => {
      if (text.includes(keyword)) {
        extractedSkills.push(skill);
      }
    });
    
    return [...baseSkills, ...extractedSkills];
  }
  
  private static extractPrerequisites(goal: Goal, domainKnowledge: ExpertKnowledge[]): string[] {
    const prerequisites: string[] = [];
    
    // Extract from domain knowledge
    const relevantKnowledge = domainKnowledge.filter(k => 
      k.type === 'concept' && (k.difficulty || 0) >= 6
    );
    
    relevantKnowledge.forEach(knowledge => {
      if (knowledge.relatedConceptIds?.length) {
        prerequisites.push(...knowledge.relatedConceptIds.slice(0, 2));
      }
    });
    
    // Add common prerequisites based on goal category
    const categoryPrerequisites: Record<string, string[]> = {
      'tech': ['Basic Programming', 'Computer Science Fundamentals'],
      'data_science': ['Statistics', 'Programming', 'Mathematics'],
      'ai_ml': ['Linear Algebra', 'Calculus', 'Programming', 'Statistics'],
      'business': ['Business Fundamentals', 'Communication Skills'],
      'design': ['Design Principles', 'Creative Tools Proficiency']
    };
    
    const basePrereqs = categoryPrerequisites[goal.category] || [];
    return Array.from(new Set([...prerequisites, ...basePrereqs])).slice(0, 5);
  }
  
  private static estimateDuration(
    goal: Goal, 
    userProfile: UserProfile, 
    skillGaps: string[]
  ): number {
    let baseDays = 30; // Default duration
    
    // Adjust based on complexity
    const complexityMultiplier = (goal.difficultyLevel || 5) * 0.2;
    baseDays *= complexityMultiplier;
    
    // Skill gap penalty
    baseDays += skillGaps.length * 7; // 7 days per missing skill
    
    // User profile adjustments
    const paceMultiplier = {
      'slow': 1.5,
      'medium': 1.0,
      'fast': 0.7,
      'adaptive': 1.0
    }[userProfile.preferredPace || 'medium'];
    
    baseDays *= (paceMultiplier || 1.0);
    
    // Experience factor
    const performanceScore = parseFloat(userProfile.overallPerformanceScore || '0');
    if (performanceScore > 7) baseDays *= 0.8; // Experienced users faster
    if (performanceScore < 4) baseDays *= 1.3; // Beginners need more time
    
    return Math.max(7, Math.round(baseDays)); // Minimum 1 week
  }
  
  private static generateMilestones(goal: Goal, complexity: number): string[] {
    const milestones: string[] = [];
    
    // Generate milestones based on goal structure
    if (complexity <= 3) {
      milestones.push(
        `Complete basic ${goal.category} fundamentals`,
        `Achieve intermediate proficiency`,
        `Complete final project or assessment`
      );
    } else if (complexity <= 7) {
      milestones.push(
        `Master foundational concepts`,
        `Complete practical exercises`,
        `Build intermediate project`,
        `Advanced techniques mastery`,
        `Capstone project completion`
      );
    } else {
      milestones.push(
        `Deep theoretical understanding`,
        `Hands-on practice with tools`,
        `Intermediate project showcase`,
        `Advanced problem solving`,
        `Expert-level project`,
        `Portfolio and documentation`,
        `Community contribution or teaching`
      );
    }
    
    return milestones;
  }
  
  private static assessRisks(
    goal: Goal, 
    userProfile: UserProfile, 
    skillGaps: string[]
  ): string[] {
    const risks: string[] = [];
    
    // Skill gap risks
    if (skillGaps.length > 5) {
      risks.push('High number of prerequisite skills missing');
    }
    
    // Complexity vs experience mismatch
    const performanceScore = parseFloat(userProfile.overallPerformanceScore || '0');
    if ((goal.difficultyLevel || 5) > performanceScore + 2) {
      risks.push('Goal complexity exceeds current skill level');
    }
    
    // Time availability risks
    if (userProfile.preferredPace === 'slow' && (goal.difficultyLevel || 5) > 7) {
      risks.push('Slow pace may lead to motivation issues with complex goal');
    }
    
    // Consistency risks
    const consistencyScore = parseFloat(userProfile.consistencyRating || '0');
    if (consistencyScore < 5) {
      risks.push('Low consistency history may impact long-term commitment');
    }
    
    return risks;
  }
  
  private static calculateConfidence(
    goal: Goal, 
    userProfile: UserProfile, 
    domainKnowledge: ExpertKnowledge[]
  ): number {
    let confidence = 70; // Base confidence
    
    // Domain knowledge availability
    const relevantKnowledge = domainKnowledge.filter(k => 
      k.title.toLowerCase().includes(goal.category) ||
      (goal.description || '').toLowerCase().includes(k.title.toLowerCase())
    );
    
    confidence += Math.min(relevantKnowledge.length * 2, 20);
    
    // User profile factors
    const performanceScore = parseFloat(userProfile.overallPerformanceScore || '0');
    confidence += (performanceScore - 5) * 3;
    
    const adaptabilityScore = parseFloat(userProfile.adaptabilityScore || '0');
    confidence += (adaptabilityScore - 5) * 2;
    
    // Goal clarity
    if ((goal.description || '').length > 50) confidence += 5;
    if (goal.targetOutcome?.length > 30) confidence += 5;
    
    return Math.max(10, Math.min(95, Math.round(confidence)));
  }
  
  // ===== INTELLIGENT TASK GENERATION =====
  
  static generateTaskPlan(context: TaskGenerationContext): Task[] {
    const { goal, userProfile, currentSkills } = context;
    
    const analysis = this.analyzeGoal(goal, userProfile, currentSkills, []);
    const taskStructure = this.designTaskStructure(goal, analysis);
    
    return this.generateDetailedTasks(taskStructure, context);
  }
  
  private static designTaskStructure(goal: Goal, analysis: GoalAnalysis): any {
    const structure: any = {
      phases: [],
      totalTasks: 0,
      complexity: analysis.complexity
    };
    
    // Phase 1: Foundation Building
    if (analysis.skillGaps.length > 0) {
      structure.phases.push({
        name: 'Foundation Building',
        type: 'learning',
        tasks: analysis.skillGaps.map(skill => ({
          title: `Learn ${skill} fundamentals`,
          type: 'learning',
          difficulty: Math.min(analysis.complexity - 2, 3),
          estimatedHours: this.estimateTaskHours(skill, 'learning')
        }))
      });
    }
    
    // Phase 2: Core Learning
    structure.phases.push({
      name: 'Core Learning',
      type: 'learning',
      tasks: analysis.milestones.slice(0, 3).map((milestone, index) => ({
        title: milestone,
        type: 'learning',
        difficulty: analysis.complexity - 2 + index,
        estimatedHours: this.estimateTaskHours(milestone, 'learning')
      }))
    });
    
    // Phase 3: Practical Application
    structure.phases.push({
      name: 'Practical Application',
      type: 'practice',
      tasks: [
        {
          title: `Build practice project for ${goal.category}`,
          type: 'project',
          difficulty: analysis.complexity - 1,
          estimatedHours: this.estimateTaskHours('practice project', 'project')
        },
        {
          title: 'Apply knowledge to real scenarios',
          type: 'practice',
          difficulty: analysis.complexity,
          estimatedHours: this.estimateTaskHours('application', 'practice')
        }
      ]
    });
    
    // Phase 4: Mastery & Assessment
    if (analysis.complexity > 6) {
      structure.phases.push({
        name: 'Mastery & Assessment',
        type: 'assessment',
        tasks: [
          {
            title: 'Complete comprehensive project',
            type: 'project',
            difficulty: analysis.complexity,
            estimatedHours: this.estimateTaskHours('comprehensive project', 'project')
          },
          {
            title: 'Self-assessment and knowledge verification',
            type: 'assessment',
            difficulty: analysis.complexity - 1,
            estimatedHours: this.estimateTaskHours('assessment', 'assessment')
          }
        ]
      });
    }
    
    structure.totalTasks = structure.phases.reduce(
      (sum: number, phase: { tasks: any[] }) => sum + phase.tasks.length, 0
    );
    
    return structure;
  }
  
  private static estimateTaskHours(taskContent: string, taskType: string): number {
    const baseHours: Record<string, number> = {
      'learning': 8,
      'practice': 12,
      'project': 20,
      'assessment': 4,
      'milestone': 6
    };
    
    let hours = baseHours[taskType] || 8;
    
    // Adjust based on content complexity
    const complexKeywords = [
      'advanced', 'comprehensive', 'full', 'complete', 'master',
      'expert', 'professional', 'enterprise', 'production'
    ];
    
    const complexCount = complexKeywords.filter(keyword => 
      taskContent.toLowerCase().includes(keyword)
    ).length;
    
    hours += complexCount * 4;
    
    return Math.max(2, Math.min(40, hours));
  }
  
  private static generateDetailedTasks(structure: any, context: TaskGenerationContext): Task[] {
    const tasks: Task[] = [];
    let orderIndex = 0;
    
    structure.phases.forEach((phase: any, phaseIndex: number) => {
      // Add phase header task
      tasks.push({
        id: '', // Will be set by database
        planId: '', // Will be set when creating plan
        goalId: context.goal.id,
        title: `Phase ${phaseIndex + 1}: ${phase.name}`,
        description: `Begin ${phase.name.toLowerCase()} phase of your learning journey`,
        type: 'milestone',
        parentTaskId: null,
        orderIndex: orderIndex++,
        depth: 0,
        estimatedDuration: 30, // 30 minutes for milestone
        difficultyRating: Math.max(1, structure.complexity - 3),
        personalizedInstructions: this.generatePersonalizedInstructions(phase, context),
        status: 'pending',
        timeSpent: 0,
        attemptCount: 0,
        createdAt: new Date(),
        dueDate: null,
        startedAt: null,
        completedAt: null,
        adaptedDifficulty: null,
        adaptationReason: null,
        successRate: null
      } as Task);
      
      const milestoneTaskId = `milestone_${phaseIndex}`;
      
      // Add detailed tasks for this phase
      phase.tasks.forEach((taskData: any, taskIndex: number) => {
        const detailedTasks = this.breakdownTask(taskData, context, milestoneTaskId);
        
        detailedTasks.forEach(task => {
          tasks.push({
            ...task,
            planId: '', // Will be set when creating plan
            goalId: context.goal.id,
            orderIndex: orderIndex++,
            parentTaskId: milestoneTaskId
          });
        });
      });
    });
    
    return tasks;
  }
  
  private static breakdownTask(taskData: any, context: TaskGenerationContext, parentId: string): Task[] {
    const baseTask = {
      id: '',
      planId: '',
      goalId: context.goal.id,
      title: taskData.title,
      description: this.generateTaskDescription(taskData, context),
      type: taskData.type,
      parentTaskId: parentId,
      orderIndex: 0,
      depth: 1,
      estimatedDuration: taskData.estimatedHours * 60,
      difficultyRating: Math.max(1, Math.min(10, taskData.difficulty)),
      personalizedInstructions: this.generatePersonalizedInstructions(taskData, context),
      status: 'pending',
      timeSpent: 0,
      attemptCount: 0,
      createdAt: new Date(),
      dueDate: null,
      startedAt: null,
      completedAt: null,
      adaptedDifficulty: null,
      adaptationReason: null,
      successRate: null
    } as Task;
    
    // Break down complex tasks into subtasks
    if (taskData.estimatedHours > 16) {
      return this.createSubtasks(baseTask, taskData, context);
    }
    
    return [baseTask];
  }
  
  private static createSubtasks(parentTask: Task, taskData: any, context: TaskGenerationContext): Task[] {
    const subtasks: Task[] = [parentTask];
    const subtaskCount = Math.ceil(taskData.estimatedHours / 8);
    
    for (let i = 0; i < subtaskCount; i++) {
      const subtask = {
        ...parentTask,
        title: `${parentTask.title} - Part ${i + 1}`,
        description: `Complete part ${i + 1} of ${parentTask.title.toLowerCase()}`,
        depth: 2,
        estimatedDuration: Math.round(taskData.estimatedHours * 60 / subtaskCount),
        difficultyRating: Math.max(1, (parentTask.difficultyRating || 5) - 1)
      } as Task;
      
      subtasks.push(subtask);
    }
    
    return subtasks;
  }
  
  private static generateTaskDescription(taskData: any, context: TaskGenerationContext): string {
    const templates: Record<string, string> = {
      'learning': `Master the concepts and principles of ${taskData.title.toLowerCase()}. Focus on understanding the theoretical foundation and practical applications.`,
      'practice': `Apply your knowledge through hands-on exercises and real-world scenarios. Build confidence through practical implementation.`,
      'project': `Create a comprehensive project that demonstrates your mastery of ${context.goal.category} skills. This will serve as portfolio evidence.`,
      'assessment': `Evaluate your progress and identify areas for improvement. Ensure you meet the learning objectives before proceeding.`,
      'milestone': `Celebrate your progress and prepare for the next phase of learning. Review what you've accomplished and plan ahead.`
    };
    
    return templates[taskData.type] || `Complete the task: ${taskData.title}`;
  }
  
  private static generatePersonalizedInstructions(taskData: any, context: TaskGenerationContext): string {
    const { userProfile } = context;
    
    let instructions = '';
    
    // Learning style adaptation
    if (userProfile.learningStyle === 'visual') {
      instructions += 'Focus on diagrams, charts, and visual representations. ';
    } else if (userProfile.learningStyle === 'auditory') {
      instructions += 'Use podcasts, videos, and verbal explanations. ';
    } else if (userProfile.learningStyle === 'kinesthetic') {
      instructions += 'Emphasize hands-on practice and interactive exercises. ';
    }
    
    // Pace adaptation
    if (userProfile.preferredPace === 'slow') {
      instructions += 'Take your time to thoroughly understand each concept. ';
    } else if (userProfile.preferredPace === 'fast') {
      instructions += 'Challenge yourself with additional advanced topics. ';
    }
    
    // Difficulty preference
    if (userProfile.difficultyPreference === 'incremental') {
      instructions += 'Start with easier concepts and gradually increase complexity. ';
    } else if (userProfile.difficultyPreference === 'challenge') {
      instructions += 'Jump into challenging problems to accelerate learning. ';
    }
    
    return instructions.trim() || 'Follow the standard learning approach for this task.';
  }
}

// ===== PERFORMANCE ANALYTICS ENGINE =====

export class PerformanceAnalyticsEngine {
  
  static analyzePerformance(
    userId: string,
    events: PerformanceEvent[],
    currentGoals: Goal[]
  ): PerformanceInsights {
    
    const recentEvents = events.filter(e => 
      e.timestamp && new Date(e.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    
    const currentTrend = this.calculateTrend(recentEvents);
    const strongAreas = this.identifyStrongAreas(recentEvents);
    const improvementAreas = this.identifyWeakAreas(recentEvents);
    const recommendedActions = this.generateRecommendations(recentEvents, currentGoals);
    const predictedSuccess = this.predictSuccess(recentEvents, currentGoals);
    const riskLevel = this.assessRiskLevel(recentEvents, currentGoals);
    const motivationLevel = this.calculateMotivationLevel(recentEvents);
    
    return {
      currentTrend,
      strongAreas,
      improvementAreas,
      recommendedActions,
      predictedSuccess,
      riskLevel,
      motivationLevel
    };
  }
  
  private static calculateTrend(events: PerformanceEvent[]): 'improving' | 'stable' | 'declining' {
    if (events.length < 5) return 'stable';
    
    const scores = events
      .filter(e => e.qualityScore !== null)
      .map(e => parseFloat(e.qualityScore || '0'))
      .slice(-10); // Last 10 events
    
    if (scores.length < 3) return 'stable';
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const improvement = secondAvg - firstAvg;
    
    if (improvement > 0.5) return 'improving';
    if (improvement < -0.5) return 'declining';
    return 'stable';
  }
  
  private static identifyStrongAreas(events: PerformanceEvent[]): string[] {
    const areaScores: Record<string, number[]> = {};
    
    events.forEach(event => {
      if (event.eventType && event.qualityScore !== null) {
        if (!areaScores[event.eventType]) {
          areaScores[event.eventType] = [];
        }
        areaScores[event.eventType].push(parseFloat(event.qualityScore));
      }
    });
    
    const strongAreas: string[] = [];
    
    Object.entries(areaScores).forEach(([area, scores]) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore >= 7 && scores.length >= 3) {
        strongAreas.push(this.formatAreaName(area));
      }
    });
    
    return strongAreas.slice(0, 5);
  }
  
  private static identifyWeakAreas(events: PerformanceEvent[]): string[] {
    const areaScores: Record<string, number[]> = {};
    
    events.forEach(event => {
      if (event.eventType && event.qualityScore !== null) {
        if (!areaScores[event.eventType]) {
          areaScores[event.eventType] = [];
        }
        areaScores[event.eventType].push(parseFloat(event.qualityScore));
      }
    });
    
    const weakAreas: string[] = [];
    
    Object.entries(areaScores).forEach(([area, scores]) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore < 5 && scores.length >= 2) {
        weakAreas.push(this.formatAreaName(area));
      }
    });
    
    return weakAreas.slice(0, 3);
  }
  
  private static formatAreaName(eventType: string): string {
    const nameMap: Record<string, string> = {
      'task_start': 'Task Initiation',
      'task_complete': 'Task Completion',
      'milestone': 'Milestone Achievement',
      'struggle': 'Problem Solving',
      'breakthrough': 'Learning Breakthroughs'
    };
    
    return nameMap[eventType] || eventType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  
  private static generateRecommendations(events: PerformanceEvent[], goals: Goal[]): string[] {
    const recommendations: string[] = [];
    
    // Focus time analysis
    const focusTimes = events
      .filter(e => e.focusTime !== null)
      .map(e => e.focusTime || 0);
    
    if (focusTimes.length > 0) {
      const avgFocus = focusTimes.reduce((a, b) => a + b, 0) / focusTimes.length;
      
      if (avgFocus < 30) {
        recommendations.push('Try using the Pomodoro Technique to improve focus (25-minute focused sessions)');
      } else if (avgFocus > 120) {
        recommendations.push('Consider taking more regular breaks to maintain optimal performance');
      }
    }
    
    // Consistency analysis
    const eventDates = events.map(e => new Date(e.timestamp || 0));
    const daysSinceLastActivity = Math.floor(
      (Date.now() - Math.max(...eventDates.map(d => d.getTime()))) / (24 * 60 * 60 * 1000)
    );
    
    if (daysSinceLastActivity > 3) {
      recommendations.push('Maintain consistent daily practice to build momentum');
    }
    
    // Difficulty optimization
    const strugglingEvents = events.filter(e => e.eventType === 'struggle');
    if (strugglingEvents.length > events.length * 0.4) {
      recommendations.push('Consider adjusting task difficulty or seeking additional learning resources');
    }
    
    // Success patterns
    const successfulEvents = events.filter(e => 
      e.eventType === 'task_complete' && parseFloat(e.qualityScore || '0') >= 7
    );
    
    if (successfulEvents.length > 0) {
      const successTimes = successfulEvents.map(e => e.timeOfDay).filter((time): time is string => Boolean(time));
      const mostSuccessfulTime = this.findMostCommon(successTimes);
      
      if (mostSuccessfulTime) {
        recommendations.push(`Schedule challenging tasks during ${mostSuccessfulTime} when you perform best`);
      }
    }
    
    return recommendations.slice(0, 4);
  }
  
  private static findMostCommon(arr: string[]): string {
    if (arr.length === 0) return '';
    
    const frequency: Record<string, number> = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Object.entries(frequency).reduce((a, b) => 
      frequency[a[0]] > frequency[b[0]] ? a : b
    )[0];
  }
  
  private static predictSuccess(events: PerformanceEvent[], goals: Goal[]): number {
    if (events.length < 5) return 50; // Default prediction
    
    let successScore = 50;
    
    // Recent performance trend
    const recentQualityScores = events
      .filter(e => e.qualityScore !== null)
      .slice(-5)
      .map(e => parseFloat(e.qualityScore || '0'));
    
    if (recentQualityScores.length > 0) {
      const avgQuality = recentQualityScores.reduce((a, b) => a + b, 0) / recentQualityScores.length;
      successScore += (avgQuality - 5) * 8; // Quality score influence
    }
    
    // Consistency factor
    const eventDates = events.map(e => new Date(e.timestamp || 0).toDateString());
    const uniqueDays = new Set(eventDates).size;
    const totalDays = Math.max(1, Math.floor(
      (Date.now() - Math.min(...events.map(e => new Date(e.timestamp || 0).getTime()))) / (24 * 60 * 60 * 1000)
    ));
    
    const consistencyRatio = uniqueDays / totalDays;
    successScore += consistencyRatio * 20;
    
    // Struggle recovery
    const struggles = events.filter(e => e.eventType === 'struggle').length;
    const breakthroughs = events.filter(e => e.eventType === 'breakthrough').length;
    
    if (struggles > 0) {
      const recoveryRate = breakthroughs / struggles;
      successScore += recoveryRate * 15;
    }
    
    return Math.max(5, Math.min(95, Math.round(successScore)));
  }
  
  private static assessRiskLevel(events: PerformanceEvent[], goals: Goal[]): 'low' | 'medium' | 'high' {
    let riskFactors = 0;
    
    // Recent inactivity
    const daysSinceLastActivity = Math.floor(
      (Date.now() - Math.max(...events.map(e => new Date(e.timestamp || 0).getTime()))) / (24 * 60 * 60 * 1000)
    );
    
    if (daysSinceLastActivity > 7) riskFactors += 2;
    else if (daysSinceLastActivity > 3) riskFactors += 1;
    
    // Performance decline
    const recentScores = events
      .filter(e => e.qualityScore !== null)
      .slice(-5)
      .map(e => parseFloat(e.qualityScore || '0'));
    
    if (recentScores.length >= 3) {
      const decline = recentScores[0] - recentScores[recentScores.length - 1];
      if (decline > 2) riskFactors += 2;
      else if (decline > 1) riskFactors += 1;
    }
    
    // Struggling pattern
    const recentStruggles = events
      .filter(e => e.eventType === 'struggle')
      .slice(-5);
    
    if (recentStruggles.length >= 3) riskFactors += 1;
    
    // Low confidence
    const avgConfidence = events
      .filter(e => e.confidenceLevel !== null)
      .map(e => parseFloat(e.confidenceLevel || '0'))
      .reduce((sum, score, _, arr) => sum + score / arr.length, 0);
    
    if (avgConfidence < 4) riskFactors += 1;
    
    if (riskFactors >= 4) return 'high';
    if (riskFactors >= 2) return 'medium';
    return 'low';
  }
  
  private static calculateMotivationLevel(events: PerformanceEvent[]): number {
    if (events.length === 0) return 5;
    
    let motivationScore = 5;
    
    // Recent activity frequency
    const recentEvents = events.filter(e => 
      e.timestamp && new Date(e.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    motivationScore += Math.min(recentEvents.length * 0.5, 3);
    
    // Completion rate
    const completions = events.filter(e => e.eventType === 'task_complete').length;
    const starts = events.filter(e => e.eventType === 'task_start').length;
    
    if (starts > 0) {
      const completionRate = completions / starts;
      motivationScore += completionRate * 2;
    }
    
    // Breakthrough moments
    const breakthroughs = events.filter(e => e.eventType === 'breakthrough').length;
    motivationScore += Math.min(breakthroughs * 0.5, 2);
    
    return Math.max(1, Math.min(10, Math.round(motivationScore)));
  }
  
  // ===== ADAPTIVE OPTIMIZATION =====
  
  static generateAdaptationTriggers(
    goal: Goal,
    tasks: Task[],
    events: PerformanceEvent[]
  ): AdaptationTrigger[] {
    const triggers: AdaptationTrigger[] = [];
    
    // Performance-based adaptations
    const performanceTrigger = this.checkPerformanceTriggers(tasks, events);
    if (performanceTrigger) triggers.push(performanceTrigger);
    
    // Time-based adaptations
    const timeTrigger = this.checkTimeTriggers(goal, tasks, events);
    if (timeTrigger) triggers.push(timeTrigger);
    
    // Difficulty adaptations
    const difficultyTrigger = this.checkDifficultyTriggers(tasks, events);
    if (difficultyTrigger) triggers.push(difficultyTrigger);
    
    // Motivation adaptations
    const motivationTrigger = this.checkMotivationTriggers(events);
    if (motivationTrigger) triggers.push(motivationTrigger);
    
    return triggers;
  }
  
  private static checkPerformanceTriggers(tasks: Task[], events: PerformanceEvent[]): AdaptationTrigger | null {
    const recentCompletions = events.filter(e => 
      e.eventType === 'task_complete' &&
      e.timestamp && new Date(e.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentCompletions.length === 0) return null;
    
    const avgQuality = recentCompletions
      .filter(e => e.qualityScore !== null)
      .map(e => parseFloat(e.qualityScore || '0'))
      .reduce((sum, score, _, arr) => sum + score / arr.length, 0);
    
    if (avgQuality >= 8.5) {
      return {
        type: 'performance',
        reason: 'Consistently high performance detected - user ready for increased challenge',
        suggestedChanges: {
          action: 'increase_difficulty',
          adjustments: {
            difficultyIncrease: 1,
            addAdvancedTasks: true,
            accelerateTimeline: true
          }
        },
        impact: 'moderate',
        confidence: 85
      };
    }
    
    if (avgQuality < 4) {
      return {
        type: 'performance',
        reason: 'Low performance scores - need to simplify or provide additional support',
        suggestedChanges: {
          action: 'decrease_difficulty',
          adjustments: {
            difficultyDecrease: 1,
            addSupportTasks: true,
            extendTimeline: true
          }
        },
        impact: 'major',
        confidence: 90
      };
    }
    
    return null;
  }
  
  private static checkTimeTriggers(goal: Goal, tasks: Task[], events: PerformanceEvent[]): AdaptationTrigger | null {
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    
    if (totalTasks === 0) return null;
    
    const progressPercentage = (completedTasks / totalTasks) * 100;
    const timeElapsed = goal.createdAt ? 
      (Date.now() - new Date(goal.createdAt).getTime()) / (24 * 60 * 60 * 1000) : 0;
    
    const originalDuration = goal.estimatedDuration || 30;
    const timePercentage = (timeElapsed / originalDuration) * 100;
    
    const progressVsTime = progressPercentage - timePercentage;
    
    if (progressVsTime > 20) {
      return {
        type: 'time',
        reason: 'Ahead of schedule - can accelerate or add enrichment activities',
        suggestedChanges: {
          action: 'accelerate_plan',
          adjustments: {
            shortenDurations: true,
            addBonusTasks: true,
            advanceDeadlines: true
          }
        },
        impact: 'moderate',
        confidence: 80
      };
    }
    
    if (progressVsTime < -30) {
      return {
        type: 'time',
        reason: 'Behind schedule - need to adjust timeline or simplify tasks',
        suggestedChanges: {
          action: 'extend_timeline',
          adjustments: {
            extendDeadlines: true,
            removeLowPriorityTasks: true,
            simplifyComplexTasks: true
          }
        },
        impact: 'major',
        confidence: 85
      };
    }
    
    return null;
  }
  
  private static checkDifficultyTriggers(tasks: Task[], events: PerformanceEvent[]): AdaptationTrigger | null {
    const strugglingEvents = events.filter(e => e.eventType === 'struggle');
    const totalTaskEvents = events.filter(e => 
      e.eventType === 'task_start' || e.eventType === 'task_complete'
    );
    
    if (totalTaskEvents.length === 0) return null;
    
    const struggleRate = strugglingEvents.length / totalTaskEvents.length;
    
    if (struggleRate > 0.4) {
      return {
        type: 'difficulty',
        reason: 'High struggle rate indicates tasks may be too difficult',
        suggestedChanges: {
          action: 'adjust_difficulty',
          adjustments: {
            decreaseDifficulty: 2,
            addPrerequisiteTasks: true,
            provideAdditionalResources: true
          }
        },
        impact: 'major',
        confidence: 88
      };
    }
    
    if (struggleRate < 0.1) {
      return {
        type: 'difficulty',
        reason: 'Very low struggle rate - tasks may be too easy',
        suggestedChanges: {
          action: 'increase_challenge',
          adjustments: {
            increaseDifficulty: 1,
            addStretchGoals: true,
            introduceAdvancedConcepts: true
          }
        },
        impact: 'moderate',
        confidence: 75
      };
    }
    
    return null;
  }
  
  private static checkMotivationTriggers(events: PerformanceEvent[]): AdaptationTrigger | null {
    // Check for extended inactivity
    const lastActivity = events.length > 0 ? 
      Math.max(...events.map(e => new Date(e.timestamp || 0).getTime())) : 0;
    
    const daysSinceActivity = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);
    
    if (daysSinceActivity > 5) {
      return {
        type: 'motivation',
        reason: 'Extended inactivity detected - need motivation boost',
        suggestedChanges: {
          action: 'boost_motivation',
          adjustments: {
            addMotivationalContent: true,
            createQuickWins: true,
            sendReminders: true,
            adjustGoalsToSmallerSteps: true
          }
        },
        impact: 'major',
        confidence: 90
      };
    }
    
    // Check for low confidence patterns
    const recentConfidence = events
      .filter(e => e.confidenceLevel !== null)
      .slice(-5)
      .map(e => parseFloat(e.confidenceLevel || '0'));
    
    if (recentConfidence.length >= 3) {
      const avgConfidence = recentConfidence.reduce((a, b) => a + b, 0) / recentConfidence.length;
      
      if (avgConfidence < 4) {
        return {
          type: 'motivation',
          reason: 'Low confidence levels - need support and encouragement',
          suggestedChanges: {
            action: 'build_confidence',
            adjustments: {
              addConfidenceBuildingTasks: true,
              providePositiveFeedback: true,
              celebrateSmallWins: true,
              adjustExpectations: true
            }
          },
          impact: 'moderate',
          confidence: 82
        };
      }
    }
    
    return null;
  }
}