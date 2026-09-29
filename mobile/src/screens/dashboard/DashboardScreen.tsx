import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList, MainTabParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { refreshDailyFocus } from '../../hooks/useDailyFocus';
import { useCoinBalance } from '../../hooks/useCoinBalance';
import { api } from '../../lib/api';
import { COACH_RELEASE_AVAILABLE } from '../../lib/coachAvailability';
import { loadDashboardStats, type DashboardStats } from '../../lib/dashboard';
import DailyFocusCard from '../../components/DailyFocusCard';
import MoodSelector from '../../components/MoodSelector';
import { t } from '../../i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';

function SkeletonBox({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: any;
}) {
  const { color: themeColor } = useTheme();

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: themeColor('#E5E7EB', 'background'),
          borderRadius: 8,
        },
        style,
      ]}
    />
  );
}

function StatCardSkeleton() {
  const styles = useThemedStyles(baseStyles);

  return (
    <View style={styles.statCard}>
      <SkeletonBox width={32} height={32} style={{ marginBottom: 12 }} />
      <SkeletonBox width={48} height={28} style={{ marginBottom: 8 }} />
      <SkeletonBox width={64} height={14} />
    </View>
  );
}

function ActionButtonSkeleton() {
  const styles = useThemedStyles(baseStyles);

  return (
    <View style={styles.actionButton}>
      <SkeletonBox width={24} height={24} style={{ marginRight: 16 }} />
      <SkeletonBox width={140} height={18} />
    </View>
  );
}

export default function DashboardScreen() {
  const styles = useThemedStyles(baseStyles);
  const { color: themeColor } = useTheme();

  const { user, userProfile, updateMood } = useAuthStore();
  const coins = useCoinBalance();
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
        StackNavigationProp<MainStackParamList>
      >
    >();
  const focusCard = (
    <DailyFocusCard
      onGoals={() => navigation.navigate('Goals')}
      onTasks={() => navigation.navigate('Tasks')}
    />
  );
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
    setLoading(true);
    try {
      setStats(await loadDashboardStats(api));
    } catch {
      setStats(null);
      setError(t('please_try_again'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void coins.refresh();
    void refreshDailyFocus();
    loadDashboard();
  };

  const renderSkeletonLoading = () => (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <SkeletonBox width={120} height={18} style={{ marginBottom: 8 }} />
          <SkeletonBox width={180} height={32} />
        </View>

        {focusCard}
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

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {focusCard}
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons
                name="cloud-offline-outline"
                size={48}
                color={themeColor('#9CA3AF', 'text')}
              />
            </View>
            <Text style={styles.errorTitle}>{t('something_went_wrong')}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadDashboard}
              data-testid="button-retry-dashboard"
            >
              <Ionicons name="refresh" size={20} color={themeColor('#FFFFFF', 'text')} />
              <Text style={styles.retryButtonText}>{t('try_again')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
          <Text style={styles.greeting}>{t('welcome_back')}</Text>
          <Text style={styles.username}>
            {userProfile?.displayName ||
              user?.displayName ||
              (user as any)?.firstName ||
              (user as any)?.lastName ||
              'there'}
          </Text>
        </View>

        {focusCard}
        <View style={styles.coinBadgeContainer}>
          <TouchableOpacity
            style={styles.coinBadge}
            onPress={() => (navigation as any).navigate('Coins')}
            accessibilityRole="button"
            accessibilityLabel={t('coin_balance_get_more_coins')}
            data-testid="button-coins"
          >
            <Ionicons name="wallet" size={18} color={themeColor('#92400E', 'text')} />
            <Text style={styles.coinBalance}>{coins.balance ?? '—'} Coins</Text>
            <Ionicons name="add-circle" size={16} color={themeColor('#92400E', 'text')} />
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
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: themeColor('#F3E8FF', 'background') },
              ]}
            >
              <Ionicons name="flag" size={24} color={themeColor('#8B5CF6', 'text')} />
            </View>
            <Text style={styles.statValue}>{stats?.activeGoals || 0}</Text>
            <Text style={styles.statLabel}>{t('active_goals')}</Text>
          </View>

          <TouchableOpacity
            style={styles.statCard}
            accessibilityRole="button"
            accessibilityLabel={t('my_tasks')}
            testID="button-open-tasks"
            onPress={() => navigation.navigate('Tasks')}
          >
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: themeColor('#D1FAE5', 'background') },
              ]}
            >
              <Ionicons name="checkmark-circle" size={24} color={themeColor('#10B981', 'text')} />
            </View>
            <Text style={styles.statValue}>{stats?.completedTasks || 0}</Text>
            <Text style={styles.statLabel}>{t('completed')}</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColor('#6B7280', 'text')} />
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: themeColor('#FEF3C7', 'background') },
              ]}
            >
              <Ionicons name="flame" size={24} color={themeColor('#F59E0B', 'text')} />
            </View>
            <Text style={styles.statValue}>{stats?.streaks || 0}</Text>
            <Text style={styles.statLabel}>{t('total_streaks')}</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: themeColor('#E0E7FF', 'background') },
              ]}
            >
              <Ionicons name="repeat" size={24} color={themeColor('#6366F1', 'text')} />
            </View>
            <Text style={styles.statValue}>{stats?.totalHabits || 0}</Text>
            <Text style={styles.statLabel}>{t('habits')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Habits')}
            activeOpacity={0.7}
            data-testid="button-habits"
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: themeColor('#F3E8FF', 'background') },
              ]}
            >
              <Ionicons name="add-circle" size={22} color={themeColor('#8B5CF6', 'text')} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionText}>{t('my_habits')}</Text>
              <Text style={styles.actionSubtext}>{t('habits_check')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColor('#9CA3AF', 'text')} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Goals')}
            activeOpacity={0.7}
            data-testid="button-view-goals"
          >
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: themeColor('#F3E8FF', 'background') },
              ]}
            >
              <Ionicons name="flag" size={22} color={themeColor('#8B5CF6', 'text')} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionText}>{t('view_my_goals')}</Text>
              <Text style={styles.actionSubtext}>{t('track_your_progress')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColor('#9CA3AF', 'text')} />
          </TouchableOpacity>

          {COACH_RELEASE_AVAILABLE && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Coach')}
              activeOpacity={0.7}
              data-testid="button-ai-coach"
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: themeColor('#F3E8FF', 'background') },
                ]}
              >
                <Ionicons name="sparkles" size={22} color={themeColor('#8B5CF6', 'text')} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionText}>{t('talk_to_lilove')}</Text>
                <Text style={styles.actionSubtext}>{t('get_personalized_guidance')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColor('#9CA3AF', 'text')} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
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
