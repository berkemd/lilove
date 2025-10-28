/**
 * Client-Side AI Service
 * 
 * This service provides browser-based AI capabilities that work:
 * - Offline with cached responses
 * - Using Web APIs (no server required)
 * - With intelligent fallbacks
 * - Progressive enhancement approach
 */

interface AIResponse {
  response: string;
  source: 'cache' | 'api' | 'fallback';
  cached: boolean;
}

interface AIRequest {
  message: string;
  type?: 'chat' | 'insight' | 'suggestion' | 'motivation';
  category?: string;
}

// Client-side cache using localStorage
const CACHE_KEY_PREFIX = 'ai_cache_';
const CACHE_DURATION = 3600000; // 1 hour
const MAX_CACHE_SIZE = 50;

/**
 * Get cached response from localStorage
 */
function getCachedResponse(key: string): string | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!cached) return null;
    
    const { response, timestamp } = JSON.parse(cached);
    
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

/**
 * Cache a response in localStorage
 */
function cacheResponse(key: string, response: string): void {
  try {
    // Clean old cache if needed
    cleanOldCache();
    
    localStorage.setItem(
      CACHE_KEY_PREFIX + key,
      JSON.stringify({ response, timestamp: Date.now() })
    );
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Clean old cache entries
 */
function cleanOldCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    
    if (keys.length > MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = keys.map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, timestamp: data.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      });
      
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, keys.length - MAX_CACHE_SIZE);
      toRemove.forEach(({ key }) => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}

/**
 * Call server API for AI response
 */
async function callServerAPI(request: AIRequest): Promise<string | null> {
  try {
    const response = await fetch('/api/ai/enhanced-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      credentials: 'include',
    });
    
    if (!response.ok) {
      console.warn('Server API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error calling server API:', error);
    return null;
  }
}

/**
 * Get offline fallback response
 */
function getOfflineFallback(type: string): string {
  const fallbacks: Record<string, string[]> = {
    motivation: [
      "Every step forward is progress, no matter how small. Keep going! 💪",
      "You're stronger than you think. Believe in yourself! ✨",
      "Success is the sum of small efforts repeated daily. 🎯",
      "Today is a new opportunity to make progress. Seize it! 🚀",
      "Your dedication is admirable. Keep building those positive habits! 🌟",
    ],
    insight: [
      "Breaking tasks into smaller steps makes them more achievable.",
      "Consistency beats intensity. Focus on showing up every day.",
      "Reflect on your progress regularly to stay motivated.",
      "Small wins compound into big achievements over time.",
      "Your mindset shapes your reality. Think positively!",
    ],
    suggestion: [
      "Start with just 5 minutes and build from there.",
      "Set a clear intention before beginning your task.",
      "Eliminate one distraction from your environment.",
      "Celebrate your progress, no matter how small.",
      "Connect with someone who supports your goals.",
    ],
    chat: [
      "I'm here to help you grow. What would you like to focus on?",
      "Tell me more about what you're working on.",
      "That's a great question! Let's explore it together.",
      "Every challenge is an opportunity to learn and grow.",
      "You're on the right track. Keep pushing forward!",
    ],
  };
  
  const options = fallbacks[type] || fallbacks.chat;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Main AI chat function with intelligent fallbacks
 */
export async function aiChat(request: AIRequest): Promise<AIResponse> {
  const { message, type = 'chat' } = request;
  
  // Generate cache key
  const cacheKey = `${type}:${message.substring(0, 30)}`;
  
  // Check cache first
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return {
      response: cached,
      source: 'cache',
      cached: true,
    };
  }
  
  // Try server API
  const serverResponse = await callServerAPI(request);
  if (serverResponse) {
    cacheResponse(cacheKey, serverResponse);
    return {
      response: serverResponse,
      source: 'api',
      cached: false,
    };
  }
  
  // Use offline fallback
  const fallbackResponse = getOfflineFallback(type);
  return {
    response: fallbackResponse,
    source: 'fallback',
    cached: false,
  };
}

/**
 * Get AI insights
 */
export async function getAIInsights(): Promise<string[]> {
  try {
    const response = await fetch('/api/ai/insights', {
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.insights;
    }
  } catch (error) {
    console.error('Error getting insights:', error);
  }
  
  // Fallback insights
  return [
    "💪 Focus on consistency over intensity.",
    "🎯 Small daily actions lead to big results.",
    "✨ You're capable of more than you think!",
  ];
}

/**
 * Get motivational quote
 */
export async function getMotivationalQuote(): Promise<string> {
  try {
    const response = await fetch('/api/ai/motivational-quote', {
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.quote;
    }
  } catch (error) {
    console.error('Error getting quote:', error);
  }
  
  // Fallback quotes
  const quotes = [
    "The secret of getting ahead is getting started. - Mark Twain",
    "It always seems impossible until it's done. - Nelson Mandela",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "The future depends on what you do today. - Mahatma Gandhi",
    "Believe you can and you're halfway there. - Theodore Roosevelt",
  ];
  
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Get smart suggestions
 */
export async function getSmartSuggestions(category?: string): Promise<string[]> {
  try {
    const url = category 
      ? `/api/ai/smart-suggestions?category=${encodeURIComponent(category)}`
      : '/api/ai/smart-suggestions';
    
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.suggestions;
    }
  } catch (error) {
    console.error('Error getting suggestions:', error);
  }
  
  // Fallback suggestions
  return [
    "Set one small, achievable goal for today",
    "Take 10 minutes for self-reflection",
    "Celebrate a recent win, no matter how small",
  ];
}

/**
 * Get AI motivation
 */
export async function getAIMotivation(): Promise<AIResponse> {
  return aiChat({
    message: "Give me motivation to keep going",
    type: 'motivation',
  });
}

/**
 * Clear AI cache
 */
export function clearAICache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    return {
      size: keys.length,
      keys: keys.map(k => k.replace(CACHE_KEY_PREFIX, '')),
    };
  } catch (error) {
    return { size: 0, keys: [] };
  }
}

// Export everything as default
export default {
  aiChat,
  getAIInsights,
  getMotivationalQuote,
  getSmartSuggestions,
  getAIMotivation,
  clearAICache,
  getCacheStats,
};
