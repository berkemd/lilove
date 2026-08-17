import { OpenAI } from 'openai';
import { AIProviderError, AIConfigError, AIQuotaError, AITimeoutError } from '../errors/aiErrors';

/**
 * Google Gemini API Integration (Free Tier)
 * - 1M tokens/minute
 * - 1500 requests/day
 * - No credit card required
 * 
 * Get API key from: https://ai.google.dev
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Gemini client using OpenAI-compatible API
const geminiClient = GEMINI_API_KEY ? new OpenAI({
  apiKey: GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
}) : null;

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generateGeminiResponse(
  messages: GeminiMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  if (!geminiClient) {
    throw new AIConfigError('Gemini API key');
  }

  try {
    const response = await geminiClient.chat.completions.create({
      model: options?.model || 'gemini-2.0-flash',
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 1000,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('[Gemini] API error:', error);
    
    if (error.status === 429) {
      throw new AIQuotaError('gemini');
    } else if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      throw new AITimeoutError('gemini', 30000);
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new AIProviderError('gemini', error);
    }
    
    throw new AIProviderError('gemini', error);
  }
}

export async function generateGeminiStreamResponse(
  messages: GeminiMessage[],
  onChunk: (chunk: string) => void,
  options?: {
    model?: string;
    temperature?: number;
  }
): Promise<void> {
  if (!geminiClient) {
    throw new AIConfigError('Gemini API key');
  }

  try {
    const stream = await geminiClient.chat.completions.create({
      model: options?.model || 'gemini-2.0-flash',
      messages,
      temperature: options?.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        onChunk(content);
      }
    }
  } catch (error: any) {
    console.error('[Gemini] Streaming error:', error);
    
    onChunk('\n\n[Error: AI response temporarily unavailable. Please try again.]');
    
    if (error.status === 429) {
      throw new AIQuotaError('gemini');
    } else if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      throw new AITimeoutError('gemini', 30000);
    }
    
    throw new AIProviderError('gemini', error);
  }
}

export const gemini = {
  generate: generateGeminiResponse,
  stream: generateGeminiStreamResponse,
  isConfigured: () => !!GEMINI_API_KEY,
};

export default gemini;
