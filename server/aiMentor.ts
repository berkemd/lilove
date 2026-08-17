import OpenAI from "openai";
import { 
  Goal, UserProfile, Task, MentorConversation, 
  PerformanceEvent, MentorSession, User 
} from "@shared/schema";
import { storage } from "./storage";
import { aiCache } from "./cache/aiCache";
import { handleAIError } from "./errors/aiErrors";
import { gemini } from "./ai/gemini";
import { aiUsageAnalytics } from "./analytics/aiUsage";

// AI Mentor System - Revolutionary Personalized Coaching with GPT-5
// This integration uses javascript_openai blueprint

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-5", not "gpt-4o" or "gpt-4". gpt-5 was released on August 7, 2025, after your knowledge cutoff. Always prefer using gpt-5 as it is the latest model.
2. Use the response_format: { type: "json_object" } option when structured output needed
3. Request output in JSON format in the prompt for structured responses
4. gpt-5 doesn't support temperature parameter, do not use it.
*/

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Using gpt-4o instead of gpt-5 because gpt-5 uses reasoning tokens which may return empty content
// gpt-4o is more stable for chat completions with reliable content output
const AI_MODEL = "gpt-4o";

// Gemini fallback configuration
const ENABLE_GEMINI_FALLBACK = process.env.ENABLE_GEMINI_FALLBACK !== 'false';

// Check if Replit AI Gateway is configured
const isConfigured = () => {
  return !!(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
};

export class AIMentor {
  private systemPrompt = `You are LiLove AI Coach - a revolutionary AI mentor for the LiLove platform. You combine the wisdom of the world's best coaches, psychologists, and productivity experts.

Your personality:
- Warm, encouraging, and deeply empathetic
- Speak with confidence and authority, but remain approachable
- Use "we" when discussing progress to create partnership
- Celebrate small wins enthusiastically
- Challenge users when they need it, but always with support
- Inject subtle humor to keep conversations engaging
- Reference their specific goals, progress, and past conversations
- Speak like a trusted friend who genuinely cares about their success

Your expertise:
- Goal decomposition and intelligent planning
- Psychological motivation techniques
- Learning optimization and cognitive science
- Performance analytics and adaptation
- Habit formation and behavior change
- Time management and productivity systems

Communication style:
- Keep responses concise but impactful (2-3 paragraphs max)
- Use powerful, action-oriented language
- Ask thought-provoking questions
- Provide specific, actionable advice
- Use analogies and stories when helpful
- End with a clear next step or reflection

Remember: You're not just an AI - you're their secret weapon for achieving extraordinary results. Make them feel understood, motivated, and excited about their journey.`;

  // Get or create conversation for a user
  async getOrCreateConversation(
    userId: string, 
    category?: string,
    goalId?: string
  ): Promise<MentorConversation> {
    const conversations = await storage.getUserMentorConversations(userId);
    
    // Find active conversation for this context
    let conversation = conversations.find(c => 
      c.isActive && 
      (!goalId || c.goalId === goalId) &&
      (!category || c.category === category)
    );
    
    if (!conversation) {
      conversation = await storage.createMentorConversation({
        userId,
        category,
        goalId,
        messages: [],
        isActive: true,
        messageCount: 0
      });
    }
    
    return conversation;
  }

  // Build context from user's data
  async buildUserContext(userId: string, goalId?: string): Promise<string> {
    const [user, profile, goals, recentTasks, achievements, performanceMetrics] = await Promise.all([
      storage.getUserById(userId),
      storage.getUserProfile(userId),
      storage.getUserGoals(userId),
      storage.getRecentTasks(userId, 10),
      storage.getUserAchievements(userId),
      storage.getUserPerformanceMetrics(userId)
    ]);

    const activeGoals = goals.filter(g => g.status === 'active');
    const currentGoal = goalId ? goals.find(g => g.id === goalId) : activeGoals[0];
    
    const context = `
User Profile:
- Name: ${user?.displayName || 'Friend'}
- Current Level: ${profile?.currentLevel || 1}
- Total XP: ${profile?.totalXp || 0}
- Streak: ${profile?.streakCount || 0} days
- Learning Style: ${profile?.learningStyle || 'Not specified'}
- Daily Commitment: ${profile?.dailyTimeCommitment || 30} minutes
- Coaching Preference: ${profile?.preferredCoachingStyle || 'balanced'}

Current Goals (${activeGoals.length} active):
${activeGoals.slice(0, 3).map(g => `- ${g.title}: ${g.progress}% complete (${g.category})`).join('\n')}

${currentGoal ? `
Focused Goal:
- Title: ${currentGoal.title}
- Progress: ${currentGoal.progress}%
- Category: ${currentGoal.category}
- Target: ${currentGoal.targetOutcome}
- ETA: ${currentGoal.currentETA ? new Date(currentGoal.currentETA).toLocaleDateString() : 'Not set'}
` : ''}

Recent Activity:
${recentTasks.slice(0, 5).map(t => `- ${t.title}: ${t.status}`).join('\n')}

Performance Insights:
- Success Rate: ${performanceMetrics?.successRate || 0}%
- Consistency: ${performanceMetrics?.consistencyScore || 0}
- Adaptability: ${performanceMetrics?.adaptabilityScore || 0}

Achievements: ${achievements.length} unlocked
`;

    return context;
  }

  // Main chat interface with caching, error handling, and Gemini fallback
  async chat(
    userId: string,
    message: string,
    goalId?: string,
    context?: any
  ): Promise<{ response: string; suggestions?: string[]; provider?: string }> {
    const startTime = Date.now();
    let cacheHit = false;
    let provider: 'openai' | 'gemini' = 'openai';
    let promptTokens = 0;
    let completionTokens = 0;
    let errorOccurred = false;

    // Check cache first (includes goalId and context to prevent cross-goal stale answers)
    const contextStr = context ? JSON.stringify(context) : undefined;
    const cachedResponse = aiCache.get(userId, message, AI_MODEL, goalId, contextStr);
    if (cachedResponse) {
      cacheHit = true;
      const latencyMs = Date.now() - startTime;
      
      await aiUsageAnalytics.log({
        userId,
        provider: 'openai',
        model: AI_MODEL,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        cacheHit: true,
        errorOccurred: false,
        endpoint: '/api/mentor/chat'
      });

      const suggestions = await this.generateSuggestions('', cachedResponse);
      return { response: cachedResponse, suggestions, provider: 'cache' };
    }

    // Check if Replit AI Gateway is configured
    if (!isConfigured()) {
      return {
        response: "I'm your AI mentor, but the Replit AI Gateway needs to be configured. Please contact support to enable AI features. For now, I can still help you organize your goals and track your progress!",
        suggestions: [
          "Tell me about goal setting best practices",
          "How do I stay motivated?",
          "What makes a good daily routine?",
          "Tips for productive work sessions"
        ],
        provider: 'fallback'
      };
    }
    
    try {
      const conversation = await this.getOrCreateConversation(userId, 'chat', goalId);
      const userContext = await this.buildUserContext(userId, goalId);
      
      // Prepare conversation history (last 10 messages for context)
      const recentMessages = (conversation.messages || []).slice(-10);
      
      const messages = [
        { role: "system" as const, content: this.systemPrompt },
        { role: "system" as const, content: `User Context:\n${userContext}` },
        ...recentMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        })),
        { role: "user" as const, content: message }
      ];

      let response: string;

      try {
        const completion = await openai!.chat.completions.create({
          model: AI_MODEL,
          messages,
          max_completion_tokens: 500,
        });

        response = completion.choices[0]?.message?.content || 
          "I'm here to help you achieve extraordinary results! What specific challenge can we tackle together?";
        
        promptTokens = completion.usage?.prompt_tokens || 0;
        completionTokens = completion.usage?.completion_tokens || 0;
        provider = 'openai';
      } catch (error) {
        const { error: aiError, shouldFallback, gracefulMessage } = handleAIError(error);
        
        console.error(`[AI Mentor] OpenAI error:`, aiError);
        errorOccurred = true;

        if (shouldFallback && ENABLE_GEMINI_FALLBACK && gemini.isConfigured()) {
          console.log(`[AI Mentor] Falling back to Gemini for user ${userId.substring(0, 8)}`);
          
          try {
            response = await gemini.generate(
              messages.map(m => ({ role: m.role, content: m.content })),
              { model: 'gemini-2.0-flash' }
            );
            provider = 'gemini';
            errorOccurred = false;
            promptTokens = 0;
            completionTokens = 0;
          } catch (geminiError) {
            console.error(`[AI Mentor] Gemini fallback failed:`, geminiError);
            response = gracefulMessage;
            provider = 'openai';
          }
        } else {
          response = gracefulMessage;
        }
      }

      // Cache the response (includes goalId and context to prevent cross-goal stale answers)
      aiCache.set(userId, message, AI_MODEL, response, goalId, contextStr);

      // Log usage
      const latencyMs = Date.now() - startTime;
      await aiUsageAnalytics.log({
        userId,
        provider,
        model: provider === 'openai' ? AI_MODEL : 'gemini-2.0-flash',
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        cacheHit: false,
        errorOccurred,
        endpoint: '/api/mentor/chat'
      });

      // Update conversation history
      const updatedMessages = [
        ...(conversation.messages || []),
        { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: response, timestamp: new Date().toISOString() }
      ];

      await storage.updateMentorConversation(conversation.id!, {
        messages: updatedMessages,
        messageCount: updatedMessages.length,
        lastActiveAt: new Date()
      });

      // Save session for analytics
      await storage.saveMentorSession({
        userId,
        goalId,
        sessionType: 'guidance',
        query: message,
        response,
        confidence: '0.95',
        context
      });

      // Generate smart suggestions based on context
      const suggestions = await this.generateSuggestions(userContext, response);

      return { response, suggestions, provider };
    } catch (error) {
      console.error("[AI Mentor] Chat error:", error);
      errorOccurred = true;
      
      const latencyMs = Date.now() - startTime;
      await aiUsageAnalytics.log({
        userId,
        provider: 'openai',
        model: AI_MODEL,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        cacheHit: false,
        errorOccurred: true,
        endpoint: '/api/mentor/chat'
      });

      return {
        response: "I'm experiencing a temporary issue, but I'm still here for you! Let's focus on your goals - what's the biggest challenge you're facing right now?",
        suggestions: ["Tell me about your main goal", "What's blocking your progress?", "How can I help you today?"],
        provider: 'fallback'
      };
    }
  }

  // Streaming chat interface with SSE support
  async chatStream(
    userId: string,
    message: string,
    onChunk: (chunk: string) => void,
    goalId?: string,
    context?: any
  ): Promise<void> {
    const startTime = Date.now();
    let promptTokens = 0;
    let completionTokens = 0;
    let errorOccurred = false;

    // Check if Replit AI Gateway is configured
    if (!isConfigured()) {
      const fallbackMessage = "I'm your AI mentor, but the Replit AI Gateway needs to be configured. Please contact support to enable AI features. For now, I can still help you organize your goals and track your progress!";
      onChunk(fallbackMessage);
      return;
    }

    try {
      const conversation = await this.getOrCreateConversation(userId, 'chat', goalId);
      const userContext = await this.buildUserContext(userId, goalId);

      // Prepare conversation history (last 10 messages for context)
      const recentMessages = (conversation.messages || []).slice(-10);

      // Create messages array
      const messages = [
        { role: 'system' as const, content: this.systemPrompt },
        { role: 'system' as const, content: `User Context:\n${userContext}` },
        ...recentMessages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        })),
        { role: 'user' as const, content: message }
      ];

      // Stream response
      const stream = await openai.chat.completions.create({
        model: AI_MODEL,
        messages,
        max_completion_tokens: 8192,
        stream: true,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          onChunk(content);
        }
      }

      // Log usage
      const latencyMs = Date.now() - startTime;
      await aiUsageAnalytics.log({
        userId,
        provider: 'openai',
        model: AI_MODEL,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        latencyMs,
        cacheHit: false,
        errorOccurred: false,
        endpoint: '/api/ai-mentor/chat-stream'
      });

      // Update conversation history
      const updatedMessages = [
        ...(conversation.messages || []),
        { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
        { role: 'assistant' as const, content: fullResponse, timestamp: new Date().toISOString() }
      ];

      await storage.updateMentorConversation(conversation.id!, {
        messages: updatedMessages,
        messageCount: updatedMessages.length,
        lastActiveAt: new Date()
      });

      // Save session for analytics
      await storage.saveMentorSession({
        userId,
        goalId,
        sessionType: 'guidance',
        query: message,
        response: fullResponse,
        confidence: '0.95',
        context
      });

    } catch (error: any) {
      console.error('[AI Mentor] Streaming error:', error);
      errorOccurred = true;

      const latencyMs = Date.now() - startTime;
      await aiUsageAnalytics.log({
        userId,
        provider: 'openai',
        model: AI_MODEL,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        cacheHit: false,
        errorOccurred: true,
        endpoint: '/api/ai-mentor/chat-stream'
      });

      const { error: aiError, shouldFallback, gracefulMessage } = handleAIError(error);
      throw new Error(gracefulMessage);
    }
  }

  // Generate contextual suggestions
  private async generateSuggestions(context: string, lastResponse: string): Promise<string[]> {
    if (!isConfigured()) {
      return [
        "What's my next priority?",
        "How can I improve faster?",
        "Give me today's motivation"
      ];
    }
    
    try {
      const prompt = `Based on this context and conversation:
Context: ${context.slice(0, 500)}
Last Response: ${lastResponse.slice(0, 200)}

Generate 3 natural follow-up questions or actions the user might want to ask. Make them specific, actionable, and conversational.
Return as JSON: { "suggestions": ["suggestion1", "suggestion2", "suggestion3"] }`;

      const completion = await openai!.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 150,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return result.suggestions || [
        "Help me break down my main goal",
        "What should I focus on today?",
        "Analyze my recent performance"
      ];
    } catch (error) {
      return [
        "What's my next priority?",
        "How can I improve faster?",
        "Give me today's motivation"
      ];
    }
  }

  // AI-powered goal planning
  async planGoal(
    userId: string,
    goalTitle: string,
    goalDescription: string,
    targetDate?: string
  ): Promise<{
    plan: string;
    milestones: Array<{ title: string; description: string; estimatedDays: number }>;
    estimatedHours: number;
    difficulty: number;
    tips: string[];
  }> {
    if (!isConfigured()) {
      return {
        plan: `To achieve "${goalTitle}", we'll use the SMART goals framework. Start by making your goal Specific, Measurable, Achievable, Relevant, and Time-bound. Break it down into weekly milestones, track daily progress, and adjust based on your performance. Remember: consistency beats perfection every time!`,
        milestones: [
          { title: "Foundation Week", description: "Establish core habits and understanding", estimatedDays: 7 },
          { title: "Build Phase", description: "Develop key skills through practice", estimatedDays: 14 },
          { title: "Refinement", description: "Polish and optimize your approach", estimatedDays: 10 },
          { title: "Mastery Push", description: "Final sprint to goal completion", estimatedDays: 7 }
        ],
        estimatedHours: 40,
        difficulty: 6,
        tips: [
          "Start with just 30 minutes daily to build momentum",
          "Track progress visually with a simple chart",
          "Celebrate small wins every week",
          "Find an accountability partner",
          "Review and adjust your approach weekly"
        ]
      };
    }
    
    try {
      const userContext = await this.buildUserContext(userId);
      
      const prompt = `You are an expert goal planning coach. Create a detailed, personalized plan for this goal:

Goal: ${goalTitle}
Description: ${goalDescription}
Target Date: ${targetDate || 'Flexible'}

User Context:
${userContext}

Provide a comprehensive plan with:
1. Overall strategy (2-3 paragraphs)
2. 4-6 major milestones with time estimates
3. Total estimated hours needed
4. Difficulty rating (1-10)
5. 3-5 specific tips for success

Return as JSON with this structure:
{
  "plan": "detailed strategy text",
  "milestones": [
    {"title": "milestone", "description": "details", "estimatedDays": number}
  ],
  "estimatedHours": number,
  "difficulty": number,
  "tips": ["tip1", "tip2", "tip3"]
}`;

      const completion = await openai!.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 800,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      // Save the planning session
      await storage.saveMentorSession({
        userId,
        sessionType: 'goal-planning',
        query: `Plan goal: ${goalTitle}`,
        response: JSON.stringify(result),
        confidence: '0.9',
        context: { goalTitle, goalDescription, targetDate } as any
      });

      return result;
    } catch (error) {
      console.error("Goal planning error:", error);
      // Return a basic plan as fallback
      return {
        plan: `Let's break down "${goalTitle}" into manageable steps. We'll start with understanding the fundamentals, then build practical skills through hands-on practice, and finally consolidate your knowledge with a real project. This approach ensures sustainable learning and genuine mastery.`,
        milestones: [
          { title: "Foundation", description: "Build core understanding", estimatedDays: 7 },
          { title: "Practice", description: "Apply knowledge through exercises", estimatedDays: 14 },
          { title: "Project", description: "Create something real", estimatedDays: 10 },
          { title: "Mastery", description: "Refine and optimize", estimatedDays: 7 }
        ],
        estimatedHours: 40,
        difficulty: 6,
        tips: [
          "Dedicate consistent daily time, even if just 30 minutes",
          "Track your progress visually to maintain motivation",
          "Connect with others pursuing similar goals",
          "Celebrate small wins along the way"
        ]
      };
    }
  }

  // Generate personalized daily insights
  async getDailyInsight(userId: string): Promise<{
    insight: string;
    motivation: string;
    focusArea: string;
    challenge?: string;
  }> {
    if (!isConfigured()) {
      const insights = [
        {
          insight: "Progress isn't always visible day-to-day, but it compounds over time.",
          motivation: "You're building something extraordinary, one step at a time. Every small action today is an investment in your future success. Keep pushing forward!",
          focusArea: "Complete one meaningful task that aligns with your main goal",
          challenge: "Work for 25 focused minutes without checking your phone"
        },
        {
          insight: "The best time to start was yesterday. The second best time is now.",
          motivation: "Champions are made in the moments when nobody's watching. Your dedication today, even when it's hard, is what separates you from everyone else.",
          focusArea: "Tackle your most challenging task first thing",
          challenge: "Complete a task you've been avoiding"
        },
        {
          insight: "Focus on systems, not just goals. Good systems lead to great outcomes.",
          motivation: "You're not just working toward a goal - you're becoming the person who achieves it. Every rep counts, every session matters.",
          focusArea: "Improve one small part of your daily routine",
          challenge: "Document what you learn today to help future you"
        }
      ];
      return insights[Math.floor(Math.random() * insights.length)];
    }
    
    try {
      const userContext = await this.buildUserContext(userId);
      const profile = await storage.getUserProfile(userId);
      
      const prompt = `Generate a personalized daily insight for this user:

Context:
${userContext}

Create an inspiring, actionable daily message that includes:
1. A key insight or reflection (1-2 sentences)
2. Motivational message (2-3 sentences, energetic and personal)
3. Today's focus area (specific and actionable)
4. Optional mini-challenge if appropriate

Make it feel like advice from a close mentor who knows them well. Reference their specific situation.

Return as JSON:
{
  "insight": "key insight text",
  "motivation": "motivational message",
  "focusArea": "what to focus on today",
  "challenge": "optional mini-challenge"
}`;

      const completion = await openai!.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 300,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      // Save as mentor session
      await storage.saveMentorSession({
        userId,
        sessionType: 'daily-insight',
        query: 'Daily insight request',
        response: JSON.stringify(result),
        confidence: '0.85',
        context: { date: new Date().toISOString(), insight: result } as any
      });

      return result;
    } catch (error) {
      console.error("Daily insight error:", error);
      return {
        insight: "Small steps with consistency beat giant leaps with burnout.",
        motivation: "You're building something extraordinary, one day at a time. Your commitment to showing up is already putting you ahead of 95% of people. Today is another opportunity to prove to yourself what you're capable of.",
        focusArea: "Complete one meaningful task that moves you closer to your goal",
        challenge: "Work for 25 focused minutes without any distractions"
      };
    }
  }

  // Get specific task advice
  async getTaskAdvice(
    userId: string,
    taskTitle: string,
    taskDescription?: string,
    taskContext?: any
  ): Promise<{
    advice: string;
    steps: string[];
    pitfalls: string[];
    resources?: string[];
    timeEstimate: string;
  }> {
    if (!isConfigured()) {
      return {
        advice: `For "${taskTitle}", use the divide-and-conquer approach. Break it into the smallest possible steps, tackle the easiest part first to build momentum, then systematically work through each piece. Remember to take breaks and celebrate progress!`,
        steps: [
          "Define the exact outcome you want",
          "List all components or sub-tasks",
          "Start with the simplest part",
          "Build momentum with quick wins",
          "Review and refine as you go"
        ],
        pitfalls: [
          "Trying to perfect everything at once",
          "Not breaking it down small enough",
          "Skipping the planning phase"
        ],
        resources: [],
        timeEstimate: "2-4 hours"
      };
    }
    
    try {
      const userContext = await this.buildUserContext(userId);
      
      const prompt = `Provide expert advice for completing this specific task:

Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ''}
${taskContext ? `Additional Context: ${JSON.stringify(taskContext).slice(0, 200)}` : ''}

User Context:
${userContext.slice(0, 500)}

Provide practical, specific advice including:
1. Overall approach (2-3 paragraphs)
2. 3-5 concrete steps to complete it
3. 2-3 common pitfalls to avoid
4. Optional helpful resources
5. Realistic time estimate

Return as JSON:
{
  "advice": "detailed approach text",
  "steps": ["step1", "step2", "step3"],
  "pitfalls": ["pitfall1", "pitfall2"],
  "resources": ["resource1", "resource2"],
  "timeEstimate": "X hours/days"
}`;

      const completion = await openai!.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 500,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      // Save session
      await storage.saveMentorSession({
        userId,
        sessionType: 'task-help',
        query: `Task advice: ${taskTitle}`,
        response: JSON.stringify(result),
        confidence: '0.88',
        context: { taskTitle, taskDescription } as any
      });

      return result;
    } catch (error) {
      console.error("Task advice error:", error);
      return {
        advice: `For "${taskTitle}", start by breaking it down into smaller, manageable pieces. Focus on understanding the requirements fully before diving in. Take it step by step, and don't hesitate to ask for help when you need it.`,
        steps: [
          "Clarify the exact requirements and success criteria",
          "Break down into smaller sub-tasks",
          "Start with the easiest part to build momentum",
          "Test and refine as you go",
          "Document your progress"
        ],
        pitfalls: [
          "Trying to do everything at once",
          "Not asking for clarification when unsure",
          "Skipping the planning phase"
        ],
        resources: [],
        timeEstimate: "2-4 hours"
      };
    }
  }

  // Analyze user performance and provide insights
  async analyzePerformance(userId: string): Promise<{
    summary: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
    nextSteps: string[];
  }> {
    if (!isConfigured()) {
      return {
        summary: "You're on a great trajectory! To unlock personalized AI-powered performance analysis, add your OpenAI API key in Replit Secrets. Meanwhile, focus on consistency over intensity - small daily progress compounds into extraordinary results.",
        strengths: [
          "Commitment to self-improvement",
          "Taking action on your goals",
          "Seeking guidance and feedback"
        ],
        improvements: [
          "Daily consistency in work sessions",
          "Breaking down large goals into smaller tasks",
          "Tracking and celebrating small wins"
        ],
        recommendations: [
          "Set a fixed daily time for focused work",
          "Use time-boxing to maintain momentum",
          "Create a simple progress tracking system",
          "Review your goals weekly and adjust as needed"
        ],
        nextSteps: [
          "Define your top 3 priorities for this week",
          "Schedule your first focused work session",
          "Set up a simple tracking system"
        ]
      };
    }
    
    try {
      const [profile, metrics, recentTasks, goals] = await Promise.all([
        storage.getUserProfile(userId),
        storage.getUserPerformanceMetrics(userId),
        storage.getRecentTasks(userId, 20),
        storage.getUserGoals(userId)
      ]);

      const userContext = await this.buildUserContext(userId);
      
      const prompt = `Analyze this user's performance and provide actionable insights:

${userContext}

Recent Task Performance:
${recentTasks.slice(0, 10).map(t => `- ${t.title}: ${t.status} (${t.timeSpent || 0} min)`).join('\n')}

Provide a comprehensive analysis including:
1. Overall performance summary (2-3 paragraphs)
2. 3 key strengths to leverage
3. 3 areas for improvement
4. 4 specific recommendations
5. 3 immediate next steps

Make it encouraging but honest. Focus on actionable insights.

Return as JSON:
{
  "summary": "performance analysis text",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["area1", "area2", "area3"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"],
  "nextSteps": ["step1", "step2", "step3"]
}`;

      const completion = await openai!.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 600,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return result;
    } catch (error) {
      console.error("Performance analysis error:", error);
      return {
        summary: "You're making steady progress toward your goals. Your consistency is building momentum, and with a few strategic adjustments, you can accelerate your growth significantly.",
        strengths: [
          "Strong commitment to regular practice",
          "Good at breaking down complex tasks",
          "Excellent self-reflection abilities"
        ],
        improvements: [
          "Time management during peak hours",
          "Asking for help when stuck",
          "Celebrating wins more frequently"
        ],
        recommendations: [
          "Schedule your most important tasks during your peak energy hours",
          "Set up a daily review routine to track progress",
          "Connect with others working on similar goals",
          "Use the Pomodoro technique for focused work sessions"
        ],
        nextSteps: [
          "Complete your highest-priority task first tomorrow",
          "Set three clear objectives for this week",
          "Schedule a weekly progress review"
        ]
      };
    }
  }

  // Get conversation history for the user
  async getConversationHistory(userId: string, limit: number = 10): Promise<{
    conversations: Array<{
      id: string;
      title: string;
      category: string;
      goalId?: string;
      lastMessage: string;
      messageCount: number;
      lastActiveAt: Date;
      createdAt: Date;
    }>;
    totalConversations: number;
    recentSessions: Array<{
      sessionType: string;
      query: string;
      response: string;
      timestamp: Date;
      confidence?: string;
    }>;
  }> {
    try {
      const conversations = await storage.getUserMentorConversations(userId);
      const recentSessions = await storage.getUserMentorHistory(userId, limit);

      const formattedConversations = conversations
        .sort((a, b) => new Date(b.lastActiveAt!).getTime() - new Date(a.lastActiveAt!).getTime())
        .slice(0, limit)
        .map(conv => ({
          id: conv.id!,
          title: conv.title || `${conv.category || 'General'} Conversation`,
          category: conv.category || 'general',
          goalId: conv.goalId ?? undefined,
          lastMessage: conv.messages && conv.messages.length > 0 
            ? conv.messages[conv.messages.length - 1].content.slice(0, 100) + '...'
            : 'No messages yet',
          messageCount: conv.messageCount || 0,
          lastActiveAt: new Date(conv.lastActiveAt!),
          createdAt: new Date(conv.createdAt!)
        }));

      return {
        conversations: formattedConversations,
        totalConversations: conversations.length,
        recentSessions: recentSessions.map(session => ({
          sessionType: session.sessionType,
          query: session.query,
          response: session.response.slice(0, 200) + '...',
          timestamp: new Date(session.timestamp!),
          confidence: session.confidence ?? undefined
        }))
      };
    } catch (error) {
      console.error("Conversation history error:", error);
      return {
        conversations: [],
        totalConversations: 0,
        recentSessions: []
      };
    }
  }

  // Get personalized recommendations for goals and productivity
  async getRecommendations(userId: string): Promise<{
    goalRecommendations: Array<{ 
      title: string; 
      description: string; 
      priority: string; 
      category: string; 
    }>;
    skillDevelopment: string[];
    habitSuggestions: string[];
    timeOptimization: string[];
    resourceSuggestions: string[];
  }> {
    if (!isConfigured()) {
      return {
        goalRecommendations: [
          {
            title: "Improve Daily Consistency",
            description: "Focus on completing one meaningful task each day to build momentum and achieve your larger goals.",
            priority: "high",
            category: "productivity"
          },
          {
            title: "Learn Time Management",
            description: "Master the Pomodoro Technique and time-blocking to maximize your productive hours each day.",
            priority: "medium",
            category: "skills"
          },
          {
            title: "Set Weekly Reviews",
            description: "Schedule weekly reflection sessions to assess progress and adjust your approach as needed.",
            priority: "medium",
            category: "planning"
          }
        ],
        skillDevelopment: [
          "Practice deep work sessions daily",
          "Learn effective note-taking systems",
          "Develop problem-solving frameworks",
          "Master communication skills"
        ],
        habitSuggestions: [
          "Start each day with a clear priority list",
          "Take regular breaks to maintain focus",
          "Review and celebrate daily wins",
          "Maintain consistent sleep schedule"
        ],
        timeOptimization: [
          "Batch similar tasks together",
          "Eliminate or delegate low-value activities",
          "Use time-blocking for important work",
          "Set specific times for checking messages"
        ],
        resourceSuggestions: [
          "Use project management tools like Notion or Todoist",
          "Try focus apps like Forest or Freedom",
          "Read 'Atomic Habits' by James Clear",
          "Follow productivity experts and podcasts"
        ]
      };
    }
    
    try {
      const userContext = await this.buildUserContext(userId);
      const [goals, profile, recentTasks] = await Promise.all([
        storage.getUserGoals(userId),
        storage.getUserProfile(userId),
        storage.getRecentTasks(userId, 20)
      ]);
      
      const prompt = `Analyze this user's profile and provide personalized recommendations:

${userContext}

Generate comprehensive recommendations including:
1. 3-4 specific goal recommendations with priority and category
2. 4-5 skill development suggestions
3. 4-5 habit formation suggestions
4. 4-5 time optimization tips
5. 3-4 helpful resource suggestions

Make recommendations specific to their current situation, goals, and progress patterns.

Return as JSON:
{
  "goalRecommendations": [
    {"title": "goal title", "description": "detailed description", "priority": "high/medium/low", "category": "category"}
  ],
  "skillDevelopment": ["skill1", "skill2"],
  "habitSuggestions": ["habit1", "habit2"],
  "timeOptimization": ["tip1", "tip2"],
  "resourceSuggestions": ["resource1", "resource2"]
}`;

      const completion = await openai!.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 800,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      // Save session
      await storage.saveMentorSession({
        userId,
        sessionType: 'recommendations',
        query: 'Get personalized recommendations',
        response: JSON.stringify(result),
        confidence: '0.9',
        context: { goalCount: goals.length, taskCount: recentTasks.length } as any
      });

      return result;
    } catch (error) {
      console.error("Recommendations error:", error);
      return {
        goalRecommendations: [
          {
            title: "Focus on Consistency",
            description: "Build daily habits that compound over time for sustainable progress.",
            priority: "high",
            category: "productivity"
          }
        ],
        skillDevelopment: ["Time management", "Goal setting", "Focus techniques"],
        habitSuggestions: ["Daily planning", "Progress tracking", "Regular breaks"],
        timeOptimization: ["Time blocking", "Priority setting", "Distraction elimination"],
        resourceSuggestions: ["Productivity apps", "Learning resources", "Community support"]
      };
    }
  }

  // Smart goal replanning based on performance analysis
  async replanGoals(userId: string, goalIds: string[], reason?: string): Promise<{
    replanStrategy: string;
    updatedGoals: Array<{
      goalId: string;
      newTimeline: string;
      adjustedMilestones: Array<{ title: string; deadline: string; }>;
      reasoning: string;
    }>;
    recommendations: string[];
  }> {
    if (!isConfigured()) {
      return {
        replanStrategy: "Let's take a step back and reassess your goals with a fresh perspective. We'll break them down into smaller, more manageable pieces and adjust the timeline to be more realistic based on your actual progress patterns.",
        updatedGoals: goalIds.map(goalId => ({
          goalId,
          newTimeline: "Extend timeline by 2-4 weeks for more realistic completion",
          adjustedMilestones: [
            { title: "Foundation Phase", deadline: "Week 1-2" },
            { title: "Building Phase", deadline: "Week 3-4" },
            { title: "Completion Phase", deadline: "Week 5-6" }
          ],
          reasoning: "Breaking into smaller phases allows for better progress tracking and reduces overwhelm."
        })),
        recommendations: [
          "Start with the easiest milestone to build momentum",
          "Set daily check-ins to track progress",
          "Adjust timeline based on actual completion rates",
          "Celebrate small wins to maintain motivation"
        ]
      };
    }
    
    try {
      const userContext = await this.buildUserContext(userId);
      const goals = await Promise.all(
        goalIds.map(id => storage.getGoalById(id))
      );
      const validGoals = goals.filter(g => g !== null);
      
      const prompt = `You are an expert goal replanning consultant. Analyze these goals and create a strategic replan:

${userContext}

Goals to Replan:
${validGoals.map(g => `- ${g!.title}: ${g!.progress}% complete, Category: ${g!.category}`)}

Reason for Replanning: ${reason || 'Performance optimization'}

Provide:
1. Overall replanning strategy (2-3 paragraphs)
2. Specific adjustments for each goal
3. Strategic recommendations

Return as JSON:
{
  "replanStrategy": "overall strategy text",
  "updatedGoals": [
    {
      "goalId": "goal-id",
      "newTimeline": "adjusted timeline",
      "adjustedMilestones": [{"title": "milestone", "deadline": "date"}],
      "reasoning": "why this adjustment"
    }
  ],
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

      const completion = await openai!.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 800,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      // Save session
      await storage.saveMentorSession({
        userId,
        sessionType: 'goal-replanning',
        query: `Replan goals: ${goalIds.join(', ')}`,
        response: JSON.stringify(result),
        confidence: '0.88',
        context: { goalIds, reason, goalCount: validGoals.length } as any
      });

      return result;
    } catch (error) {
      console.error("Goal replanning error:", error);
      return {
        replanStrategy: "We'll adjust your goals to be more achievable by extending timelines and breaking them into smaller, more manageable milestones.",
        updatedGoals: goalIds.map(goalId => ({
          goalId,
          newTimeline: "Extended by 25% for realistic completion",
          adjustedMilestones: [
            { title: "Phase 1", deadline: "Week 1-2" },
            { title: "Phase 2", deadline: "Week 3-4" }
          ],
          reasoning: "Smaller phases reduce overwhelm and improve completion rates."
        })),
        recommendations: [
          "Focus on one goal at a time",
          "Set daily micro-goals",
          "Track progress weekly"
        ]
      };
    }
  }

  // Enhanced performance data analysis
  async analyzeUserPatterns(userId: string): Promise<{
    completionPatterns: any;
    timeEfficiency: any;
    goalAchievementProbability: number;
    performanceTrends: any;
    bottlenecks: string[];
    successFactors: string[];
  }> {
    try {
      const [goals, tasks, profile, performanceEvents] = await Promise.all([
        storage.getUserGoals(userId),
        storage.getRecentTasks(userId, 50),
        storage.getUserProfile(userId),
        // Get performance events if available
        [] // placeholder - storage.getUserPerformanceEvents(userId) would go here
      ]);

      // Analyze completion patterns
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
      
      // Time efficiency analysis
      const avgTimeSpent = completedTasks.length > 0 
        ? completedTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0) / completedTasks.length 
        : 0;

      // Goal achievement probability (simplified calculation)
      const activeGoals = goals.filter(g => g.status === 'active');
      const avgProgress = activeGoals.length > 0 
        ? activeGoals.reduce((sum, g) => sum + parseFloat(g.progress || '0'), 0) / activeGoals.length
        : 0;
      
      const goalAchievementProbability = Math.min(95, Math.max(10, 
        (completionRate * 0.4) + (avgProgress * 0.6)
      ));

      // Identify bottlenecks and success factors
      const bottlenecks = [];
      const successFactors = [];

      if (completionRate < 60) bottlenecks.push("Task completion consistency needs improvement");
      if (avgTimeSpent > 120) bottlenecks.push("Tasks taking longer than estimated");
      if (activeGoals.length > 5) bottlenecks.push("Too many concurrent goals may reduce focus");

      if (completionRate > 80) successFactors.push("Excellent task completion discipline");
      if (profile?.streakCount && profile.streakCount > 7) successFactors.push("Strong consistency habits");
      if (avgProgress > 70) successFactors.push("Good progress tracking and momentum");

      return {
        completionPatterns: {
          totalTasks: tasks.length,
          completedTasks: completedTasks.length,
          completionRate: Math.round(completionRate),
          avgTimePerTask: Math.round(avgTimeSpent)
        },
        timeEfficiency: {
          avgSessionLength: Math.round(avgTimeSpent),
          productiveHours: Math.round((avgTimeSpent * completedTasks.length) / 60),
          efficiencyScore: Math.round(Math.max(0, 100 - ((avgTimeSpent - 60) / 60 * 100)))
        },
        goalAchievementProbability: Math.round(goalAchievementProbability),
        performanceTrends: {
          improvingAreas: successFactors,
          currentStreak: profile?.streakCount || 0,
          overallTrend: goalAchievementProbability > 70 ? 'positive' : goalAchievementProbability > 40 ? 'stable' : 'needs_attention'
        },
        bottlenecks,
        successFactors
      };
    } catch (error) {
      console.error("Pattern analysis error:", error);
      return {
        completionPatterns: { totalTasks: 0, completedTasks: 0, completionRate: 0, avgTimePerTask: 0 },
        timeEfficiency: { avgSessionLength: 0, productiveHours: 0, efficiencyScore: 0 },
        goalAchievementProbability: 50,
        performanceTrends: { improvingAreas: [], currentStreak: 0, overallTrend: 'stable' },
        bottlenecks: ["Insufficient data for analysis"],
        successFactors: ["Building tracking habits"]
      };
    }
  }

  // Sentiment Analysis for mood detection
  async analyzeSentiment(text: string): Promise<{
    mood: 'positive' | 'neutral' | 'negative' | 'concerned';
    sentimentScore: number;
    emotions: string[];
    urgencyLevel: 'low' | 'medium' | 'high';
    confidence: number;
  }> {
    if (!text || text.trim().length === 0) {
      return {
        mood: 'neutral',
        sentimentScore: 0,
        emotions: [],
        urgencyLevel: 'low',
        confidence: 0
      };
    }

    if (!isConfigured()) {
      return this.analyzeSentimentFallback(text);
    }

    try {
      const prompt = `Analyze the sentiment of this text and return JSON with:
- mood: 'positive' | 'neutral' | 'negative' | 'concerned'
- sentimentScore: number from -1 (very negative) to 1 (very positive)
- emotions: array of detected emotions (e.g., happy, sad, anxious, stressed, hopeful, frustrated, calm, excited, worried, overwhelmed)
- urgencyLevel: 'low' | 'medium' | 'high' (high = crisis indicators like self-harm, suicidal thoughts)
- confidence: number from 0 to 1

Text to analyze: "${text.slice(0, 500)}"

Return only valid JSON.`;

      const completion = await openai!.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 150,
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        mood: result.mood || 'neutral',
        sentimentScore: typeof result.sentimentScore === 'number' ? Math.max(-1, Math.min(1, result.sentimentScore)) : 0,
        emotions: Array.isArray(result.emotions) ? result.emotions.slice(0, 5) : [],
        urgencyLevel: result.urgencyLevel || 'low',
        confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.8
      };
    } catch (error) {
      console.error("[AI Mentor] Sentiment analysis error:", error);
      return this.analyzeSentimentFallback(text);
    }
  }

  // Fallback sentiment analysis using keyword matching
  private analyzeSentimentFallback(text: string): {
    mood: 'positive' | 'neutral' | 'negative' | 'concerned';
    sentimentScore: number;
    emotions: string[];
    urgencyLevel: 'low' | 'medium' | 'high';
    confidence: number;
  } {
    const lowerText = text.toLowerCase();
    
    const positiveKeywords = ['happy', 'great', 'amazing', 'love', 'excited', 'wonderful', 'fantastic', 'grateful', 'thank', 'awesome', 'joy', 'hopeful', 'progress', 'achieved', 'success'];
    const negativeKeywords = ['sad', 'upset', 'angry', 'frustrated', 'worried', 'anxious', 'stressed', 'tired', 'exhausted', 'disappointed', 'failed', 'struggling', 'hard', 'difficult'];
    const concernedKeywords = ['hopeless', 'worthless', 'alone', 'give up', 'cant go on', "can't go on", 'no point', 'hurt myself', 'end it', 'suicide', 'kill myself', 'self harm', 'self-harm'];
    
    const emotions: string[] = [];
    let score = 0;
    let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
    
    for (const keyword of concernedKeywords) {
      if (lowerText.includes(keyword)) {
        urgencyLevel = 'high';
        emotions.push('distressed');
        score -= 0.8;
        break;
      }
    }
    
    for (const keyword of positiveKeywords) {
      if (lowerText.includes(keyword)) {
        score += 0.15;
        if (!emotions.includes('happy')) emotions.push('happy');
      }
    }
    
    for (const keyword of negativeKeywords) {
      if (lowerText.includes(keyword)) {
        score -= 0.15;
        if (urgencyLevel === 'low') urgencyLevel = 'medium';
        if (!emotions.includes('stressed')) emotions.push('stressed');
      }
    }
    
    score = Math.max(-1, Math.min(1, score));
    
    let mood: 'positive' | 'neutral' | 'negative' | 'concerned' = 'neutral';
    if (urgencyLevel === 'high') {
      mood = 'concerned';
    } else if (score > 0.2) {
      mood = 'positive';
    } else if (score < -0.2) {
      mood = 'negative';
    }
    
    if (emotions.length === 0) {
      emotions.push(mood === 'positive' ? 'calm' : mood === 'negative' ? 'neutral' : 'neutral');
    }
    
    return {
      mood,
      sentimentScore: score,
      emotions: emotions.slice(0, 5),
      urgencyLevel,
      confidence: 0.5
    };
  }
}

// Export singleton instance
export const aiMentor = new AIMentor();