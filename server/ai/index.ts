/**
 * AI Integration Module
 * Handles AI provider selection and routing
 */

import { MockAIService } from './mock-ai-service';
import { OpenAIService } from './openai-service';
import { AnthropicService } from './anthropic-service';

export class AIIntegration {
  private provider: any;
  
  constructor() {
    // Use mock AI in development or when no API key is configured
    if (process.env.AI_MOCK_MODE === 'true' || !this.hasValidAPIKey()) {
      console.log('🤖 Using Mock AI Service (Development Mode)');
      this.provider = new MockAIService();
    } else if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('mock')) {
      console.log('🤖 Using OpenAI Service (Production)');
      const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
      this.provider = new OpenAIService(process.env.OPENAI_API_KEY, model);
    } else if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('mock')) {
      console.log('🤖 Using Anthropic Claude Service (Production)');
      const model = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';
      this.provider = new AnthropicService(process.env.ANTHROPIC_API_KEY, model);
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
