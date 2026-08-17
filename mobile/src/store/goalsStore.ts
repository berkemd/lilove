import { create } from 'zustand';
import { 
  subscribeToGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  type Goal
} from '../lib/firebase';

interface GoalsState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  unsubscribe: (() => void) | null;
  
  initializeGoals: (userId: string) => void;
  addGoal: (userId: string, goal: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  editGoal: (goalId: string, updates: Partial<Goal>) => Promise<void>;
  removeGoal: (goalId: string) => Promise<void>;
  cleanup: () => void;
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  isLoading: true,
  error: null,
  unsubscribe: null,

  initializeGoals: (userId: string) => {
    const { unsubscribe: existingUnsubscribe } = get();
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    set({ isLoading: true, error: null });

    const unsubscribe = subscribeToGoals(userId, (goals) => {
      console.log('[GoalsStore] Goals updated:', goals.length);
      set({ goals, isLoading: false });
    });

    set({ unsubscribe });
  },

  addGoal: async (userId, goalData) => {
    try {
      set({ error: null });
      const goalId = await createGoal(userId, goalData);
      console.log('[GoalsStore] Goal created:', goalId);
      return goalId;
    } catch (error: any) {
      console.error('[GoalsStore] Failed to create goal:', error);
      set({ error: error.message });
      throw error;
    }
  },

  editGoal: async (goalId, updates) => {
    try {
      set({ error: null });
      await updateGoal(goalId, updates);
      console.log('[GoalsStore] Goal updated:', goalId);
    } catch (error: any) {
      console.error('[GoalsStore] Failed to update goal:', error);
      set({ error: error.message });
      throw error;
    }
  },

  removeGoal: async (goalId) => {
    try {
      set({ error: null });
      await deleteGoal(goalId);
      console.log('[GoalsStore] Goal deleted:', goalId);
    } catch (error: any) {
      console.error('[GoalsStore] Failed to delete goal:', error);
      set({ error: error.message });
      throw error;
    }
  },

  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null, goals: [], isLoading: false });
    }
  },
}));
