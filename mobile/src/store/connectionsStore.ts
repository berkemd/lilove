import { create } from 'zustand';
import { 
  subscribeToConnections,
  createConnection,
  updateConnectionStatus,
  getMatchingUsers,
  type Connection,
  type UserProfile
} from '../lib/firebase';

interface ConnectionsState {
  connections: Connection[];
  matchSuggestions: UserProfile[];
  isLoading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  
  initializeConnections: (userId: string) => void;
  loadMatchSuggestions: (userMood: string, userId: string) => Promise<void>;
  connect: (userId: string, targetUserId: string, matchScore?: number) => Promise<string>;
  respondToConnection: (connectionId: string, accept: boolean) => Promise<void>;
  cleanup: () => void;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  connections: [],
  matchSuggestions: [],
  isLoading: true,
  error: null,
  unsubscribe: null,

  initializeConnections: (userId: string) => {
    const { unsubscribe: existingUnsubscribe } = get();
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    set({ isLoading: true, error: null });

    const unsubscribe = subscribeToConnections(userId, (connections) => {
      console.log('[ConnectionsStore] Connections updated:', connections.length);
      set({ connections, isLoading: false });
    });

    set({ unsubscribe });
  },

  loadMatchSuggestions: async (userMood: string, userId: string) => {
    try {
      set({ error: null });
      const suggestions = await getMatchingUsers(userMood, userId, 10);
      console.log('[ConnectionsStore] Match suggestions loaded:', suggestions.length);
      set({ matchSuggestions: suggestions });
    } catch (error: any) {
      console.error('[ConnectionsStore] Failed to load suggestions:', error);
      set({ error: error.message });
    }
  },

  connect: async (userId: string, targetUserId: string, matchScore?: number) => {
    try {
      set({ error: null });
      const connectionId = await createConnection(userId, targetUserId, matchScore);
      console.log('[ConnectionsStore] Connection created:', connectionId);
      return connectionId;
    } catch (error: any) {
      console.error('[ConnectionsStore] Failed to create connection:', error);
      set({ error: error.message });
      throw error;
    }
  },

  respondToConnection: async (connectionId: string, accept: boolean) => {
    try {
      set({ error: null });
      await updateConnectionStatus(connectionId, accept ? 'accepted' : 'declined');
      console.log('[ConnectionsStore] Connection response:', accept ? 'accepted' : 'declined');
    } catch (error: any) {
      console.error('[ConnectionsStore] Failed to respond to connection:', error);
      set({ error: error.message });
      throw error;
    }
  },

  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null, connections: [], matchSuggestions: [] });
    }
  },
}));
