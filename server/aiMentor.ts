// AI Mentor Service - OpenAI Integration for Personalized Coaching
import OpenAI from 'openai';
import { db } from './storage';
import { mentorSessions, mentorConversations, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIMentor {
  private systemPrompt = `You are a supportive and intelligent AI life coach helping users achieve their personal growth goals. 
Your role is to:
- Provide encouragement and motivation
- Break down large goals into actionable steps
- Offer practical advice and strategies
- Ask thought-provoking questions
- Help users overcome obstacles
- Celebrate achievements

Be empathetic, positive, and actionable in your responses. Keep responses concise but meaningful.`;

  async chat(userId: string, message: string, sessionId?: string): Promise<{ response: string; sessionId: string }> {
    try {
      let currentSessionId = sessionId;

      // Create new session if not provided
      if (!currentSessionId) {
        const newSession = await db.insert(mentorSessions).values({
          userId,
          topic: message.substring(0, 100),
          status: 'active'
        }).returning();
        currentSessionId = newSession[0].id;
      }

      // Get conversation history
      const history = await db.select()
        .from(mentorConversations)
        .where(eq(mentorConversations.sessionId, currentSessionId))
        .orderBy(desc(mentorConversations.createdAt))
        .limit(10);

      // Build messages array
      const messages: AIMessage[] = [
        { role: 'system', content: this.systemPrompt }
      ];

      // Add conversation history (in reverse order)
      history.reverse().forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });

      // Add current message
      messages.push({
        role: 'user',
        content: message
      });

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0].message.content || 'I apologize, but I couldn\'t generate a response. Please try again.';

      // Save user message
      await db.insert(mentorConversations).values({
        sessionId: currentSessionId,
        role: 'user',
        content: message
      });

      // Save AI response
      await db.insert(mentorConversations).values({
        sessionId: currentSessionId,
        role: 'assistant',
        content: response
      });

      return {
        response,
        sessionId: currentSessionId
      };
    } catch (error) {
      console.error('AI Mentor error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async getSessions(userId: string) {
    return await db.select()
      .from(mentorSessions)
      .where(eq(mentorSessions.userId, userId))
      .orderBy(desc(mentorSessions.createdAt))
      .limit(20);
  }

  async getSessionConversations(sessionId: string) {
    return await db.select()
      .from(mentorConversations)
      .where(eq(mentorConversations.sessionId, sessionId))
      .orderBy(mentorConversations.createdAt);
  }

  async endSession(sessionId: string) {
    await db.update(mentorSessions)
      .set({ status: 'completed', endedAt: new Date() })
      .where(eq(mentorSessions.id, sessionId));
  }
}

export const aiMentor = new AIMentor();
