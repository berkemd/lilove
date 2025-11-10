/**
 * OpenAI Integration Service
 * Real AI coaching using OpenAI GPT models
 */

import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async getChatResponse(message: string, context?: any): Promise<string> {
    try {
      const systemPrompt = `You are LiLove AI Coach, a supportive and motivating personal development coach. 
      You help users build better habits, achieve their goals, and improve their lives.
      Be encouraging, practical, and provide actionable advice.
      Keep responses concise but meaningful (2-4 sentences).`;

      const userContext = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message + userContext }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  async getCoachingAdvice(userData: any): Promise<any> {
    try {
      const { goals = [], habits = [], recentActivity = [] } = userData;
      
      const prompt = `Analyze this user's progress and provide personalized coaching:

Goals: ${JSON.stringify(goals)}
Habits: ${JSON.stringify(habits)}
Recent Activity: ${JSON.stringify(recentActivity)}

Provide a JSON response with:
- message: personalized coaching message
- motivation: motivational quote or statement
- advice: practical advice
- challenge: a specific challenge for the user
- insights: array of 3 insights about their performance
- encouragement: encouraging statement
- nextSteps: array of 3 specific next steps`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional life coach providing structured, actionable advice. Always respond in valid JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      return response ? JSON.parse(response) : this.getDefaultCoachingResponse();
    } catch (error) {
      console.error('OpenAI coaching advice error:', error);
      return this.getDefaultCoachingResponse();
    }
  }

  async analyzePerformance(data: any): Promise<any> {
    try {
      const { habits = [], goals = [], timeframe = 'week' } = data;

      const prompt = `Analyze this user's ${timeframe}ly performance:

Habits: ${JSON.stringify(habits)}
Goals: ${JSON.stringify(goals)}

Provide a JSON response with:
- score: performance score (0-100)
- trend: "improving", "stable", or "needs attention"
- insights: array of 3 key insights
- strengths: array of identified strengths
- improvements: array of areas for improvement
- recommendations: array of 2 specific recommendations`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a data analyst and life coach. Provide objective performance analysis. Respond in valid JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      return response ? JSON.parse(response) : this.getDefaultPerformanceAnalysis();
    } catch (error) {
      console.error('OpenAI performance analysis error:', error);
      return this.getDefaultPerformanceAnalysis();
    }
  }

  private getDefaultCoachingResponse(): any {
    return {
      message: "Great work on your progress! Keep building those positive habits.",
      motivation: "Every small step counts toward your bigger goals.",
      advice: "Focus on consistency over perfection. Small daily actions create lasting change.",
      challenge: "Try maintaining a 7-day streak on your most important habit.",
      insights: [
        "You're showing up consistently, which is the foundation of success.",
        "Focus on your top 3 priorities for maximum impact.",
        "Celebrate your small wins - they compound over time."
      ],
      encouragement: "You're making real progress. Keep going!",
      nextSteps: [
        "Review your daily habits and prioritize the top 3",
        "Set a specific time for each habit to increase completion rate",
        "Track your progress daily to maintain momentum"
      ]
    };
  }

  private getDefaultPerformanceAnalysis(): any {
    return {
      score: 70,
      trend: 'stable',
      insights: [
        "You're maintaining consistent effort",
        "Focus on high-impact activities",
        "Small improvements compound over time"
      ],
      strengths: [
        "Consistent tracking of progress",
        "Regular engagement with goals"
      ],
      improvements: [
        "Increase daily habit completion rate",
        "Set more specific, measurable goals"
      ],
      recommendations: [
        "Focus on your top 3 most important habits",
        "Schedule habits at specific times for better consistency"
      ]
    };
  }
}
