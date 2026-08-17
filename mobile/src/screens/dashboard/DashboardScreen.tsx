import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import MoodSelector from '../../components/MoodSelector';

interface Goal {
  id: string;
  title: string;
  status: string;
  description?: string;
  targetDate?: string;
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  goalId?: string;
  dueDate?: string;
}

interface Habit {
  id: string;
  name: string;
  currentStreak?: number;
  frequency?: string;
}

interface DashboardStats {
  totalGoals: number;
  activeGoals: number;
  totalTasks: number;
  completedTasks: number;
  totalHabits: number;
  streaks: number;
}

type TabParamList = {
  Dashboard: undefined;
  Goals: undefined;
  Coach: undefined;
  Profile: undefined;
};

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: '#E5E7EB',
          borderRadius: 8,
        },
        style,
      ]}
    />
  );
}

function StatCardSkeleton() {
  return (
    <View style={styles.statCard}>
      <SkeletonBox width={32} height={32} style={{ marginBottom: 12 }} />
      <SkeletonBox width={48} height={28} style={{ marginBottom: 8 }} />
      <SkeletonBox width={64} height={14} />
    </View>
  );
}

function ActionButtonSkeleton() {
  return (
    <View style={styles.actionButton}>
      <SkeletonBox width={24} height={24} style={{ marginRight: 16 }} />
      <SkeletonBox width={140} height={18} />
    </View>
  );
}

export default function DashboardScreen() {
  const { user, userProfile, updateMood } = useAuthStore();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMoodUpdating, setIsMoodUpdating] = useState(false);

  const handleMoodSelect = async (mood: string) => {
    setIsMoodUpdating(true);
    try {
      await updateMood(mood);
    } catch (err) {
      console.error('[DashboardScreen] Error updating mood:', err);
    } finally {
      setIsMoodUpdating(false);
    }
  };

  const loadDashboard = async () => {
    setError(null);
    console.log('[DashboardScreen] Loading dashboard data...');
    try {
      const [goalsData, tasksData, habitsData] = await Promise.all([
        api.getGoals() as Promise<Goal[]>,
        api.getTasks() as Promise<Task[]>,
        api.getHabits() as Promise<Habit[]>,
      ]);
      
      // Ensure arrays are never null/undefined (handle nullish responses but not thrown errors)
      const goals = Array.isArray(goalsData) ? goalsData : [];
      const tasks = Array.isArray(tasksData) ? tasksData : [];
      const habits = Array.isArray(habitsData) ? habitsData : [];
      
      console.log('[DashboardScreen] Data loaded - goals:', goals.length, 'tasks:', tasks.length, 'habits:', habits.length);

      setStats({
        totalGoals: goals.length,
        activeGoals: goals.filter((g) => g.status === 'active').length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.completed).length,
        totalHabits: habits.length,
        streaks: habits.reduce((acc, h) => acc + (h.currentStreak || 0), 0),
      });
    } catch (err: any) {
      console.error('[DashboardScreen] Error loading dashboard:', err);
      console.error('[DashboardScreen] Error details:', JSON.stringify(err, null, 2));
      setError(`Unable to load dashboard: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const renderSkeletonLoading = () => (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <SkeletonBox width={120} height={18} style={{ marginBottom: 8 }} />
          <SkeletonBox width={180} height={32} />
        </View>

        <View style={styles.coinBadgeContainer}>
          <SkeletonBox width={120} height={36} style={{ borderRadius: 20 }} />
        </View>

        <View style={styles.statsGrid}>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </View>

        <View style={styles.section}>
          <SkeletonBox width={140} height={24} style={{ marginBottom: 16 }} />
          <ActionButtonSkeleton />
          <ActionButtonSkeleton />
          <ActionButtonSkeleton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (loading && !refreshing) {
    return renderSkeletonLoading();
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadDashboard}
            data-testid="button-retry-dashboard"
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.username}>{userProfile?.displayName || user?.displayName || (user as any)?.firstName || (user as any)?.lastName || 'there'}</Text>
        </View>

        <View style={styles.coinBadgeContainer}>
          <TouchableOpacity
            style={styles.coinBadge}
            onPress={() => (navigation as any).navigate('Coins')}
            accessibilityRole="button"
            accessibilityLabel="Coin balance. Get more coins."
            data-testid="button-coins"
          >
            <Ionicons name="wallet" size={18} color="#92400E" />
            <Text style={styles.coinBalance}>{userProfile?.coinBalance || 0} Coins</Text>
            <Ionicons name="add-circle" size={16} color="#92400E" />
          </TouchableOpacity>
        </View>

        <View style={styles.moodSection}>
          <MoodSelector
            currentMood={userProfile?.mood}
            onMoodSelect={handleMoodSelect}
            isUpdating={isMoodUpdating}
            compact
          />
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="flag" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{stats?.activeGoals || 0}</Text>
            <Text style={styles.statLabel}>Active Goals</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats?.completedTasks || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="flame" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{stats?.streaks || 0}</Text>
            <Text style={styles.statLabel}>Total Streaks</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E0E7FF' }]}>
              <Ionicons name="repeat" size={24} color="#6366F1" />
            </View>
            <Text style={styles.statValue}>{stats?.totalHabits || 0}</Text>
            <Text style={styles.statLabel}>Habits</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Goals')}
            activeOpacity={0.7}
            data-testid="button-add-goal"
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="add-circle" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionText}>Add New Goal</Text>
              <Text style={styles.actionSubtext}>Set a new target to achieve</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Goals')}
            activeOpacity={0.7}
            data-testid="button-view-goals"
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="flag" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionText}>View My Goals</Text>
              <Text style={styles.actionSubtext}>Track your progress</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Coach')}
            activeOpacity={0.7}
            data-testid="button-ai-coach"
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="sparkles" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionText}>Talk to LiLove</Text>
              <Text style={styles.actionSubtext}>Get personalized guidance</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  username: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  coinBadgeContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignSelf: 'flex-start',
    gap: 8,
  },
  coinBalance: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  moodSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 16,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
