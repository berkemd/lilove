import { create } from 'zustand';
import { 
  subscribeToMessages,
  sendMessage,
  markMessageAsRead,
  type Message
} from '../lib/firebase';

interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  unreadCount: number;
}

interface MessagesState {
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  
  setActiveConversation: (conversationId: string) => void;
  initializeMessages: (conversationId: string) => void;
  send: (message: Omit<Message, 'id' | 'createdAt'>) => Promise<string>;
  markAsRead: (messageId: string) => Promise<void>;
  cleanup: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: [],
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  error: null,
  unsubscribe: null,

  setActiveConversation: (conversationId: string) => {
    set({ activeConversationId: conversationId });
    get().initializeMessages(conversationId);
  },

  initializeMessages: (conversationId: string) => {
    const { unsubscribe: existingUnsubscribe } = get();
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    set({ isLoading: true, error: null, messages: [] });

    const unsubscribe = subscribeToMessages(conversationId, (messages) => {
      console.log('[MessagesStore] Messages updated:', messages.length);
      set({ messages, isLoading: false });
    });

    set({ unsubscribe });
  },

  send: async (messageData) => {
    try {
      set({ error: null });
      const messageId = await sendMessage(messageData);
      console.log('[MessagesStore] Message sent:', messageId);
      return messageId;
    } catch (error: any) {
      console.error('[MessagesStore] Failed to send message:', error);
      set({ error: error.message });
      throw error;
    }
  },

  markAsRead: async (messageId: string) => {
    try {
      await markMessageAsRead(messageId);
    } catch (error: any) {
      console.error('[MessagesStore] Failed to mark message as read:', error);
    }
  },

  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null, messages: [], activeConversationId: null });
    }
  },
}));
