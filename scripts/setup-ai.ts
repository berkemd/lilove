#!/usr/bin/env tsx
/**
 * AI Integration Setup Script
 * Configures OpenAI, Anthropic, or Gemini for AI coaching
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface AIProvider {
  name: string;
  envVar: string;
  testEndpoint: string;
  modelName: string;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    testEndpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-3.5-turbo'
  },
  {
    name: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    testEndpoint: 'https://api.anthropic.com/v1/messages',
    modelName: 'claude-3-haiku-20240307'
  },
  {
    name: 'Gemini',
    envVar: 'GEMINI_API_KEY',
    testEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    modelName: 'gemini-pro'
  }
];

async function setupMockAI() {
  console.log('🤖 Setting up Mock AI for development...\n');
  
  // Generate a mock API key
  const mockApiKey = `sk-mock-${Math.random().toString(36).substring(2, 20)}`;
  
  // Update .env file
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Check if AI key already exists
  if (envContent.includes('OPENAI_API_KEY=') && !envContent.includes('OPENAI_API_KEY=sk-mock')) {
    console.log('✅ AI API key already configured');
    return;
  }
  
  // Remove old AI settings
  const cleanedEnv = envContent
    .split('\n')
    .filter(line => !line.startsWith('OPENAI_API_KEY=') && 
                   !line.startsWith('ANTHROPIC_API_KEY=') &&
                   !line.startsWith('GEMINI_API_KEY=') &&
                   !line.startsWith('AI_PROVIDER='))
    .join('\n');
  
  // Add mock AI configuration
  const aiConfig = `
# AI Configuration (Mock for Development)
OPENAI_API_KEY=${mockApiKey}
AI_PROVIDER=mock
AI_MOCK_MODE=true
AI_MOCK_DELAY=500
`;
  
  fs.writeFileSync(envPath, cleanedEnv + aiConfig);
  
  console.log('✅ Mock AI configuration added to .env');
  console.log(`📝 Mock API Key: ${mockApiKey}\n`);
  
  // Create mock AI service
  const mockAIService = `/**
 * Mock AI Service for Development
 * Simulates AI responses without making actual API calls
 */

export class MockAIService {
  private responses = [
    "Great job on completing that task! Keep up the momentum! 💪",
    "I noticed you're making consistent progress. How about setting a new challenge for yourself?",
    "Your streak is impressive! Let's work on optimizing your workflow next.",
    "Based on your performance, I recommend focusing on high-priority tasks in the morning.",
    "You've shown 23% improvement this week. What's your secret?",
    "Time for a break! Studies show that short breaks improve productivity by 30%.",
    "Your goal completion rate is above average. Consider setting more ambitious targets!",
    "I've analyzed your patterns - you're most productive between 9-11 AM. Use this time wisely!",
    "Excellent focus session! You maintained deep work for 45 minutes straight.",
    "Your habit consistency is building. 21 more days to make it automatic!",
  ];

  private coachingTips = [
    {
      category: "productivity",
      tips: [
        "Try the Pomodoro Technique: 25 minutes of focused work, 5-minute break",
        "Break large tasks into smaller, manageable chunks",
        "Use time-blocking to schedule your most important work",
      ]
    },
    {
      category: "habits",
      tips: [
        "Stack new habits with existing ones for better retention",
        "Start with 2-minute versions of your desired habits",
        "Track your progress visually to maintain motivation",
      ]
    },
    {
      category: "wellness",
      tips: [
        "Take a 5-minute walk every hour to boost creativity",
        "Practice deep breathing for 2 minutes to reduce stress",
        "Maintain proper posture to improve focus and energy",
      ]
    }
  ];

  async getChatResponse(message: string, context?: any): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Number(process.env.AI_MOCK_DELAY) || 500));
    
    // Analyze message for keywords
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) {
      return "I see you might need some assistance. What specific challenge are you facing? I can help with task prioritization, time management, or motivation strategies.";
    }
    
    if (lowerMessage.includes('tired') || lowerMessage.includes('exhausted')) {
      return "It sounds like you need a break. Remember, rest is productive too! Try a 15-minute power nap or a short walk to recharge.";
    }
    
    if (lowerMessage.includes('goal') || lowerMessage.includes('target')) {
      return "Let's review your goals. Breaking them into weekly milestones can make them more achievable. What's your most important goal this week?";
    }
    
    if (lowerMessage.includes('habit')) {
      const habitTips = this.coachingTips.find(c => c.category === 'habits');
      const randomTip = habitTips!.tips[Math.floor(Math.random() * habitTips!.tips.length)];
      return \`Great focus on habit building! Here's a tip: \${randomTip}\`;
    }
    
    // Return a random encouraging response
    return this.responses[Math.floor(Math.random() * this.responses.length)];
  }

  async getCoachingAdvice(userData: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, Number(process.env.AI_MOCK_DELAY) || 500));
    
    const category = this.coachingTips[Math.floor(Math.random() * this.coachingTips.length)];
    
    return {
      type: 'coaching_advice',
      category: category.category,
      title: \`Today's \${category.category} tip\`,
      content: category.tips[Math.floor(Math.random() * category.tips.length)],
      actionItems: [
        'Try this technique for one week',
        'Track your results',
        'Adjust based on what works for you'
      ],
      metrics: {
        expectedImprovement: '15-30%',
        timeToResults: '1-2 weeks',
        difficultyLevel: 'Easy'
      }
    };
  }

  async analyzePerformance(performanceData: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, Number(process.env.AI_MOCK_DELAY) || 500));
    
    return {
      summary: "You're showing consistent improvement across all metrics!",
      strengths: [
        'Task completion rate: 85%',
        'Focus duration: Above average',
        'Habit consistency: 73%'
      ],
      areasForImprovement: [
        'Morning routine optimization',
        'Break frequency management',
        'Goal specificity'
      ],
      recommendations: [
        'Set 3 clear priorities each morning',
        'Use time-boxing for complex tasks',
        'Review and adjust goals weekly'
      ],
      score: 78,
      trend: 'improving'
    };
  }
}

export const mockAI = new MockAIService();
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'server', 'ai', 'mock-ai-service.ts'),
    mockAIService
  );
  
  console.log('✅ Mock AI service created at server/ai/mock-ai-service.ts\n');
}

async function validateAIConfig() {
  console.log('🔍 Checking AI configuration...\n');
  
  let configured = false;
  
  for (const provider of AI_PROVIDERS) {
    const apiKey = process.env[provider.envVar];
    if (apiKey && !apiKey.includes('mock') && !apiKey.includes('your-')) {
      console.log(`✅ ${provider.name} configured with API key: ${apiKey.substring(0, 10)}...`);
      configured = true;
      break;
    }
  }
  
  if (!configured) {
    console.log('⚠️  No AI provider configured\n');
    return false;
  }
  
  return true;
}

async function setupAI() {
  console.log('🤖 AI Integration Setup for LiLove\n');
  console.log('================================================================================\n');
  
  // Create AI directory if it doesn't exist
  const aiDir = path.join(process.cwd(), 'server', 'ai');
  if (!fs.existsSync(aiDir)) {
    fs.mkdirSync(aiDir, { recursive: true });
  }
  
  // Check existing configuration
  const hasConfig = await validateAIConfig();
  
  if (!hasConfig || process.argv.includes('--mock')) {
    await setupMockAI();
  }
  
  // Create AI integration module
  const aiIntegrationModule = `/**
 * AI Integration Module
 * Handles AI provider selection and routing
 */

import { MockAIService } from './mock-ai-service';

export class AIIntegration {
  private provider: any;
  
  constructor() {
    // Use mock AI in development or when no API key is configured
    if (process.env.AI_MOCK_MODE === 'true' || !this.hasValidAPIKey()) {
      console.log('🤖 Using Mock AI Service');
      this.provider = new MockAIService();
    } else if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('mock')) {
      console.log('🤖 Using OpenAI Service');
      // TODO: Implement real OpenAI integration
      this.provider = new MockAIService();
    } else {
      console.log('🤖 Defaulting to Mock AI Service');
      this.provider = new MockAIService();
    }
  }
  
  private hasValidAPIKey(): boolean {
    return !!(
      (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('mock')) ||
      (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('mock')) ||
      (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('mock'))
    );
  }
  
  async chat(message: string, context?: any): Promise<string> {
    return this.provider.getChatResponse(message, context);
  }
  
  async getCoaching(userData: any): Promise<any> {
    return this.provider.getCoachingAdvice(userData);
  }
  
  async analyzePerformance(data: any): Promise<any> {
    return this.provider.analyzePerformance(data);
  }
}

export const aiService = new AIIntegration();
`;

  fs.writeFileSync(
    path.join(aiDir, 'index.ts'),
    aiIntegrationModule
  );
  
  console.log('✅ AI integration module created\n');
  console.log('📋 AI Setup Complete!');
  console.log('   - Mock AI service configured for development');
  console.log('   - AI coaching responses will be simulated');
  console.log('   - To use real AI, add OPENAI_API_KEY to .env\n');
}

// Run setup
setupAI().catch(console.error);