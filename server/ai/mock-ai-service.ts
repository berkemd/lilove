/**
 * Mock AI Service for Development
 * Provides realistic coaching responses without requiring API keys
 */

export class MockAIService {
  private coachingTemplates = {
    motivation: [
      "Great work on staying consistent! Remember, small daily improvements lead to massive long-term results. 🌟",
      "You're making excellent progress! Keep focusing on one habit at a time and watch them compound.",
      "I'm impressed by your dedication! The fact that you're here means you're already ahead of 90% of people.",
      "Consistency beats perfection every time. You're building sustainable habits that will last a lifetime.",
      "Your momentum is building! Each day you show up, you're proving to yourself that you can do this."
    ],
    advice: [
      "Try breaking down your goals into smaller, manageable tasks. This makes them less overwhelming and easier to accomplish.",
      "Consider implementing a morning routine that sets a positive tone for your entire day.",
      "Focus on building one solid habit before adding new ones. Quality over quantity!",
      "Track your progress visually - it's incredibly motivating to see how far you've come.",
      "Remember to celebrate small wins. They're not small at all - they're proof of your commitment."
    ],
    challenges: [
      "Here's a challenge: Try the 2-minute rule. If a task takes less than 2 minutes, do it immediately.",
      "Challenge yourself to a 30-day streak on your top priority habit. Can you do it?",
      "Try habit stacking: attach a new habit to an existing one. 'After I pour my coffee, I will...'",
      "This week, identify your biggest time-waster and replace it with a productive habit.",
      "Challenge: Write down 3 things you're grateful for every morning this week."
    ],
    encouragement: [
      "You've got this! Every expert was once a beginner. Keep going! 💪",
      "Don't compare your progress to others. Compare it to who you were yesterday.",
      "Setbacks are not failures - they're opportunities to learn and adjust your approach.",
      "Your future self is counting on the decisions you make today. Make them proud!",
      "Remember: It's not about being perfect, it's about being better than you were yesterday."
    ]
  };

  private performanceInsights = [
    "Your completion rate is strong! Focus on maintaining this momentum.",
    "I notice you're most productive in the morning. Try scheduling your hardest tasks then.",
    "You've shown great consistency lately. This is building real momentum!",
    "Your streak is impressive! Streaks are powerful motivators - keep it going!",
    "I see improvement in your focus time. This is where real progress happens.",
    "Your habit completion rate has increased by 15% this week. Excellent work!",
    "You're building sustainable patterns. This is the key to long-term success.",
    "Your energy management is improving. Keep optimizing your daily schedule."
  ];

  private chatResponses = {
    greetings: [
      "Hi there! I'm your AI coach, here to help you achieve your goals. What would you like to work on today?",
      "Hello! Great to see you. How can I support your journey today?",
      "Hey! Ready to make some progress? What's on your mind?",
      "Welcome back! Let's continue building those amazing habits together."
    ],
    goals: [
      "That's a great goal! Let's break it down into smaller, actionable steps.",
      "I love your ambition! Here's how we can approach this strategically...",
      "Excellent goal setting! Now let's create a concrete plan to achieve it.",
      "That's inspiring! Let me help you create a roadmap to success."
    ],
    struggles: [
      "I understand it's challenging. Let's identify what's blocking you and find solutions.",
      "It's normal to face obstacles. What do you think is the main challenge here?",
      "Thank you for being honest. Let's work together to overcome this.",
      "Everyone struggles sometimes. The important thing is that you're here, ready to improve."
    ],
    progress: [
      "Fantastic progress! What do you think contributed most to your success?",
      "You're crushing it! How does this progress feel?",
      "This is exactly the kind of momentum we want to see. Keep it up!",
      "Your consistency is paying off. This is how lasting change happens."
    ]
  };

  async getChatResponse(message: string, context?: any): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Greeting detection
    if (lowerMessage.match(/\b(hi|hello|hey|good morning|good evening)\b/)) {
      return this.randomChoice(this.chatResponses.greetings);
    }
    
    // Goal-related queries
    if (lowerMessage.match(/\b(goal|want to|trying to|achieve|accomplish)\b/)) {
      return this.randomChoice(this.chatResponses.goals);
    }
    
    // Struggle/challenge queries
    if (lowerMessage.match(/\b(struggle|difficult|hard|can't|problem|issue|stuck)\b/)) {
      return this.randomChoice(this.chatResponses.struggles);
    }
    
    // Progress queries
    if (lowerMessage.match(/\b(progress|better|improved|done|completed)\b/)) {
      return this.randomChoice(this.chatResponses.progress);
    }
    
    // Motivation request
    if (lowerMessage.match(/\b(motivate|motivation|encourage|inspire)\b/)) {
      return this.randomChoice(this.coachingTemplates.motivation);
    }
    
    // Advice request
    if (lowerMessage.match(/\b(advice|help|suggest|recommend|tip)\b/)) {
      return this.randomChoice(this.coachingTemplates.advice);
    }
    
    // Default response with context awareness
    if (context?.recentActivity) {
      return `I see you've been working on ${context.recentActivity}. ${this.randomChoice(this.coachingTemplates.encouragement)}`;
    }
    
    return `That's a great question! ${this.randomChoice(this.coachingTemplates.advice)} Is there a specific area you'd like to focus on?`;
  }

  async getCoachingAdvice(userData: any): Promise<any> {
    const { goals = [], habits = [], recentActivity = [] } = userData;
    
    // Analyze user data and provide personalized advice
    const completionRate = this.calculateCompletionRate(habits);
    const streakDays = this.calculateStreak(recentActivity);
    
    return {
      message: this.generatePersonalizedMessage(completionRate, streakDays),
      motivation: this.randomChoice(this.coachingTemplates.motivation),
      advice: this.randomChoice(this.coachingTemplates.advice),
      challenge: this.randomChoice(this.coachingTemplates.challenges),
      insights: [
        this.randomChoice(this.performanceInsights),
        this.generateCompletionInsight(completionRate),
        this.generateStreakInsight(streakDays)
      ],
      encouragement: this.randomChoice(this.coachingTemplates.encouragement),
      nextSteps: this.generateNextSteps(goals, habits)
    };
  }

  async analyzePerformance(data: any): Promise<any> {
    const { habits = [], goals = [], timeframe = 'week' } = data;
    
    const completionRate = this.calculateCompletionRate(habits);
    const productivityScore = Math.round(completionRate * 100);
    
    return {
      score: productivityScore,
      trend: completionRate > 0.7 ? 'improving' : completionRate > 0.4 ? 'stable' : 'needs attention',
      insights: [
        this.randomChoice(this.performanceInsights),
        this.generatePerformanceInsight(productivityScore),
        `Your ${timeframe}ly completion rate: ${Math.round(completionRate * 100)}%`
      ],
      strengths: this.identifyStrengths(habits),
      improvements: this.identifyImprovements(habits),
      recommendations: [
        this.randomChoice(this.coachingTemplates.advice),
        this.randomChoice(this.coachingTemplates.challenges)
      ]
    };
  }

  // Helper methods
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private calculateCompletionRate(habits: any[]): number {
    if (!habits || habits.length === 0) return 0;
    const completed = habits.filter(h => h.completed || h.status === 'completed').length;
    return completed / habits.length;
  }

  private calculateStreak(recentActivity: any[]): number {
    if (!recentActivity || recentActivity.length === 0) return 0;
    // Simple streak calculation - count consecutive days
    return Math.min(recentActivity.length, 7); // Max 7 days for display
  }

  private generatePersonalizedMessage(completionRate: number, streakDays: number): string {
    if (streakDays >= 7) {
      return `🔥 Amazing! You're on a ${streakDays}-day streak! Your dedication is truly inspiring. Let's keep this momentum going!`;
    }
    if (completionRate >= 0.8) {
      return `⭐ Excellent work! You're completing ${Math.round(completionRate * 100)}% of your habits. You're building real discipline here!`;
    }
    if (completionRate >= 0.5) {
      return `👍 Good progress! You're at ${Math.round(completionRate * 100)}% completion. Let's push this even higher!`;
    }
    return `💪 Every journey starts with a single step. You're here, and that's what matters. Let's build momentum together!`;
  }

  private generateCompletionInsight(rate: number): string {
    if (rate >= 0.8) return "Your high completion rate shows exceptional consistency!";
    if (rate >= 0.6) return "You're maintaining good consistency. Try to push it over 80%!";
    if (rate >= 0.4) return "You're making progress. Focus on your top 3 priorities.";
    return "Let's start small. Pick your #1 most important habit to focus on this week.";
  }

  private generateStreakInsight(days: number): string {
    if (days >= 7) return `Your ${days}-day streak is building serious momentum!`;
    if (days >= 3) return `${days} days in a row - you're building a habit!`;
    return "Start a streak today - consistency is key to lasting change.";
  }

  private generateNextSteps(goals: any[], habits: any[]): string[] {
    const steps = [];
    
    if (goals.length === 0) {
      steps.push("Set your first goal - what do you want to achieve this month?");
    } else {
      steps.push("Review your goals and break them into smaller milestones.");
    }
    
    if (habits.length < 3) {
      steps.push("Add 1-2 more habits that support your main goal.");
    } else if (habits.length > 5) {
      steps.push("Focus on your top 3 habits - quality over quantity!");
    }
    
    steps.push(this.randomChoice(this.coachingTemplates.challenges));
    
    return steps;
  }

  private generatePerformanceInsight(score: number): string {
    if (score >= 80) return "Outstanding performance! You're in the top tier of users.";
    if (score >= 60) return "Solid performance! Small improvements will take you to the next level.";
    if (score >= 40) return "You're making progress. Focus on consistency to boost your score.";
    return "Let's work together to improve your completion rate step by step.";
  }

  private identifyStrengths(habits: any[]): string[] {
    const strengths = [];
    const completedCount = habits.filter(h => h.completed).length;
    
    if (completedCount > 0) {
      strengths.push(`You're successfully maintaining ${completedCount} habit(s)`);
    }
    
    strengths.push("You're showing up and taking action");
    strengths.push("You're tracking your progress consistently");
    
    return strengths;
  }

  private identifyImprovements(habits: any[]): string[] {
    const improvements = [];
    const incompleteCount = habits.filter(h => !h.completed).length;
    
    if (incompleteCount > 0) {
      improvements.push("Focus on completing all daily habits");
    }
    
    improvements.push("Try scheduling your habits at specific times");
    improvements.push("Consider adding a morning routine habit");
    
    return improvements;
  }
}
