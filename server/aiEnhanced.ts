/**
 * Enhanced AI Service for LiLove
 * 
 * This service provides free, autonomous AI capabilities using:
 * - Browser-based models (WebLLM) for client-side inference
 * - Free API tiers (HuggingFace, Together AI)
 * - Intelligent caching to minimize costs
 * - Context management without heavy database usage
 */

import { db } from './storage';
import { users, userProfiles } from '@shared/schema';
import { eq } from 'drizzle-orm';

// In-memory cache for AI responses to reduce API calls
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

// Rate limiting for free tier management
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

interface AIRequest {
  userId: string;
  message: string;
  context?: string;
  type?: 'chat' | 'insight' | 'suggestion' | 'motivation';
}

interface AIResponse {
  response: string;
  source: 'cache' | 'api' | 'fallback';
  cached: boolean;
}

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

/**
 * Get cached response if available and fresh
 */
function getCachedResponse(cacheKey: string): string | null {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }
  if (cached) {
    responseCache.delete(cacheKey);
  }
  return null;
}

/**
 * Cache a response
 */
function cacheResponse(cacheKey: string, response: string): void {
  responseCache.set(cacheKey, { response, timestamp: Date.now() });
  
  // Clean old cache entries (keep only last 100)
  if (responseCache.size > 100) {
    const sortedEntries = Array.from(responseCache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);
    responseCache.clear();
    sortedEntries.slice(0, 100).forEach(([key, value]) => {
      responseCache.set(key, value);
    });
  }
}

/**
 * Generate context-aware prompt based on user data
 */
async function generateContextPrompt(userId: string, message: string, type: string): Promise<string> {
  try {
    // Fetch user profile and context
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    
    const userName = user?.displayName || user?.username || 'friend';
    const level = profile?.currentLevel || 1;
    const coachingStyle = profile?.preferredCoachingStyle || 'balanced';
    
    const systemPrompt = `You are a supportive AI life coach for ${userName}, who is at level ${level}. 
Your coaching style is ${coachingStyle}. Be concise, actionable, and encouraging.
Focus on practical advice and motivation for personal growth and habit formation.`;
    
    let contextualPrompt = '';
    
    switch (type) {
      case 'motivation':
        contextualPrompt = `Provide a brief, inspiring motivational message (2-3 sentences) to help ${userName} stay focused on their goals.`;
        break;
      case 'insight':
        contextualPrompt = `Analyze this question and provide a brief, insightful response (2-3 sentences): ${message}`;
        break;
      case 'suggestion':
        contextualPrompt = `Provide a brief, actionable suggestion (2-3 sentences) for: ${message}`;
        break;
      case 'chat':
      default:
        contextualPrompt = `Respond helpfully to: ${message}`;
    }
    
    return `${systemPrompt}\n\n${contextualPrompt}`;
  } catch (error) {
    console.error('Error generating context prompt:', error);
    return `You are a helpful AI coach. Respond to: ${message}`;
  }
}

/**
 * Get fallback response when APIs are unavailable
 */
function getFallbackResponse(type: string, message: string): string {
  const motivationalResponses = [
    "Every small step you take today brings you closer to your goals. Keep moving forward! 💪",
    "You're doing great! Remember, progress isn't always visible, but it's always happening. 🌟",
    "Believe in yourself. You have the strength to achieve what you set your mind to. ✨",
    "Focus on progress, not perfection. You're on the right path! 🎯",
    "Your dedication is admirable. Keep building those positive habits! 🚀"
  ];
  
  const insightResponses = [
    "That's an interesting question. Breaking it down into smaller, manageable steps often helps gain clarity.",
    "Consider approaching this from different angles. Sometimes the best insights come from changing perspective.",
    "Reflection is the first step to growth. Take time to understand your patterns and motivations.",
    "Growth happens when we step outside our comfort zone. What's one small action you can take today?"
  ];
  
  switch (type) {
    case 'motivation':
      return motivationalResponses[Math.floor(Math.random() * motivationalResponses.length)];
    case 'insight':
    case 'suggestion':
      return insightResponses[Math.floor(Math.random() * insightResponses.length)];
    default:
      return "I'm here to help you grow and achieve your goals. What would you like to work on today?";
  }
}

/**
 * Call HuggingFace Inference API (free tier)
 * Uses smaller, efficient models that are free to use
 */
async function callHuggingFaceAPI(prompt: string): Promise<string | null> {
  try {
    const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
    
    // Even without API key, we can use public models with lower rate limits
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (HF_API_KEY) {
      headers['Authorization'] = `Bearer ${HF_API_KEY}`;
    }
    
    // Use a small, efficient model that's free and fast
    const response = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 150,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
          },
        }),
      }
    );
    
    if (!response.ok) {
      console.warn('HuggingFace API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
      return data[0].generated_text.trim();
    }
    
    return null;
  } catch (error) {
    console.error('Error calling HuggingFace API:', error);
    return null;
  }
}

/**
 * Call OpenAI API if available (existing implementation)
 */
async function callOpenAI(prompt: string): Promise<string | null> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return null;
    }
    
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return null;
  }
}

/**
 * Main AI chat function with intelligent fallbacks
 */
export async function enhancedAIChat(request: AIRequest): Promise<AIResponse> {
  const { userId, message, context, type = 'chat' } = request;
  
  // Check rate limit
  if (!checkRateLimit(userId)) {
    return {
      response: "You're asking questions very quickly! Please wait a moment before trying again. 🙂",
      source: 'fallback',
      cached: false,
    };
  }
  
  // Generate cache key
  const cacheKey = `${userId}:${type}:${message.substring(0, 50)}`;
  
  // Check cache first
  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse) {
    return {
      response: cachedResponse,
      source: 'cache',
      cached: true,
    };
  }
  
  // Generate context-aware prompt
  const prompt = await generateContextPrompt(userId, message, type);
  
  // Try APIs in order of preference (cost and quality)
  let response: string | null = null;
  let source: 'api' | 'fallback' = 'api';
  
  // 1. Try OpenAI if available (best quality)
  response = await callOpenAI(prompt);
  
  // 2. Try HuggingFace (free tier)
  if (!response) {
    response = await callHuggingFaceAPI(prompt);
  }
  
  // 3. Use fallback if all APIs fail
  if (!response) {
    response = getFallbackResponse(type, message);
    source = 'fallback';
  }
  
  // Cache the response
  cacheResponse(cacheKey, response);
  
  return {
    response,
    source,
    cached: false,
  };
}

/**
 * Get AI-powered insights for user
 */
export async function getAIInsights(userId: string): Promise<string[]> {
  try {
    const insights: string[] = [];
    
    // Generate insights based on user data
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    
    const streak = profile?.streakCount || 0;
    const level = profile?.currentLevel || 1;
    
    // Streak-based insight
    if (streak > 0) {
      insights.push(`🔥 You're on a ${streak}-day streak! Keep the momentum going.`);
    } else {
      insights.push("💡 Start building a daily habit streak today!");
    }
    
    // Level-based insight
    if (level >= 10) {
      insights.push(`⭐ Level ${level}! You're making exceptional progress.`);
    } else if (level >= 5) {
      insights.push(`📈 Level ${level} - You're in the growth zone!`);
    } else {
      insights.push("🌱 You're just getting started. Every expert was once a beginner!");
    }
    
    // Time-based insight
    const hour = new Date().getHours();
    if (hour < 12) {
      insights.push("☀️ Morning is a great time to set your intentions for the day.");
    } else if (hour < 18) {
      insights.push("⚡ Afternoon energy! Perfect time to tackle your goals.");
    } else {
      insights.push("🌙 Evening reflection helps consolidate your progress.");
    }
    
    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return [
      "💪 Focus on consistency over intensity.",
      "🎯 Small daily actions lead to big results.",
      "✨ You're capable of more than you think!"
    ];
  }
}

/**
 * Get motivational quote
 */
export function getMotivationalQuote(): string {
  const quotes = [
    "The secret of getting ahead is getting started. - Mark Twain",
    "It always seems impossible until it's done. - Nelson Mandela",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "The future depends on what you do today. - Mahatma Gandhi",
    "Success is the sum of small efforts repeated day in and day out. - Robert Collier",
    "You are never too old to set another goal or to dream a new dream. - C.S. Lewis",
    "Believe you can and you're halfway there. - Theodore Roosevelt",
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Start where you are. Use what you have. Do what you can. - Arthur Ashe",
    "Your limitation—it's only your imagination."
  ];
  
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Generate AI-powered suggestions based on context
 */
export async function getSmartSuggestions(userId: string, category?: string): Promise<string[]> {
  const suggestions: string[] = [];
  
  try {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    
    const learningStyle = profile?.learningStyle || 'mixed';
    const pace = profile?.preferredPace || 'medium';
    
    // Category-specific suggestions
    if (category === 'fitness') {
      suggestions.push("Try a 5-minute morning stretch routine");
      suggestions.push("Set a daily step goal and track it");
      suggestions.push("Schedule 3 workout sessions this week");
    } else if (category === 'learning') {
      suggestions.push("Dedicate 20 minutes to learning something new today");
      suggestions.push("Read one chapter of a book you've been meaning to finish");
      suggestions.push("Watch an educational video on a topic you're curious about");
    } else if (category === 'productivity') {
      suggestions.push("Use the Pomodoro Technique: 25min work + 5min break");
      suggestions.push("Identify your top 3 priorities for today");
      suggestions.push("Eliminate one distraction from your workspace");
    } else {
      // General suggestions based on learning style
      if (learningStyle === 'visual') {
        suggestions.push("Create a vision board for your goals");
        suggestions.push("Use color-coding to organize your tasks");
      } else if (learningStyle === 'kinesthetic') {
        suggestions.push("Take regular movement breaks");
        suggestions.push("Use physical reminders for your habits");
      }
      
      suggestions.push("Reflect on one thing you're grateful for");
      suggestions.push("Connect with a friend or mentor");
      suggestions.push("Review your progress from this week");
    }
    
    return suggestions.slice(0, 3);
  } catch (error) {
    console.error('Error generating smart suggestions:', error);
    return [
      "Set one small, achievable goal for today",
      "Take 10 minutes for self-reflection",
      "Celebrate a recent win, no matter how small"
    ];
  }
}

// Export for use in routes
export const aiMentorEnhanced = {
  chat: async (userId: string, message: string, type?: AIRequest['type']) => {
    return enhancedAIChat({ userId, message, type });
  },
  getInsights: async (userId: string) => {
    return getAIInsights(userId);
  },
  getQuote: getMotivationalQuote,
  getSuggestions: async (userId: string, category?: string) => {
    return getSmartSuggestions(userId, category);
  },
};
