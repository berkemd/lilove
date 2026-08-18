import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { t } from '../../i18n';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  coinReward: number;
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

const ACHIEVEMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  streak: 'flame',
  goals: 'flag',
  tasks: 'checkmark-circle',
  habits: 'repeat',
  social: 'people',
  premium: 'star',
  default: 'trophy',
};

export default function AchievementsScreen({ navigation }: any) {
  const { userProfile } = useAuthStore();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setError(null);
      const data = await api.getAchievements() as any;
      if (Array.isArray(data)) {
        setAchievements(data);
      } else if (data && typeof data === 'object' && 'achievements' in data) {
        setAchievements(data.achievements);
      } else {
        setAchievements([]);
      }
    } catch (err: any) {
      console.error('Failed to load achievements:', err);
      setError(t('failed_to_load_achievements'));
      setAchievements([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAchievements();
  };

  const getIconName = (category: string): keyof typeof Ionicons.glyphMap => {
    return ACHIEVEMENT_ICONS[category] || ACHIEVEMENT_ICONS.default;
  };

  const unlockedAchievements = achievements.filter((a) => a.unlockedAt);
  const lockedAchievements = achievements.filter((a) => !a.unlockedAt);

  const renderAchievement = (achievement: Achievement, isUnlocked: boolean) => (
    <View
      key={achievement.id}
      style={[styles.achievementCard, !isUnlocked && styles.lockedCard]}
    >
      <View style={[styles.iconContainer, !isUnlocked && styles.lockedIcon]}>
        <Ionicons
          name={getIconName(achievement.category)}
          size={28}
          color={isUnlocked ? '#8B5CF6' : '#9CA3AF'}
        />
      </View>
      <View style={styles.achievementContent}>
        <Text style={[styles.achievementTitle, !isUnlocked && styles.lockedText]}>
          {achievement.title}
        </Text>
        <Text style={styles.achievementDescription}>{achievement.description}</Text>
        {achievement.progress !== undefined && achievement.target && !isUnlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((achievement.progress / achievement.target) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {achievement.progress}/{achievement.target}
            </Text>
          </View>
        )}
        {isUnlocked && (
          <View style={styles.rewardContainer}>
            <View style={styles.reward}>
              <Ionicons name="flash" size={14} color="#F59E0B" />
              <Text style={styles.rewardText}>{achievement.xpReward} XP</Text>
            </View>
            <View style={styles.reward}>
              <Ionicons name="logo-bitcoin" size={14} color="#8B5CF6" />
              <Text style={styles.rewardText}>{achievement.coinReward} Coins</Text>
            </View>
          </View>
        )}
      </View>
      {isUnlocked && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('achievements')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('achievements')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userProfile?.stats?.totalXP || 0}</Text>
            <Text style={styles.statLabel}>{t('total_xp')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unlockedAchievements.length}</Text>
            <Text style={styles.statLabel}>{t('unlocked')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Level {userProfile?.stats?.level || 1}</Text>
            <Text style={styles.statLabel}>{t('current')}</Text>
          </View>
        </View>

        {error ? (
          <TouchableOpacity style={styles.errorContainer} onPress={loadAchievements}>
            <Ionicons name="refresh" size={24} color="#6B7280" />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>{t('tap_to_retry')}</Text>
          </TouchableOpacity>
        ) : achievements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>{t('no_achievements_yet')}</Text>
            <Text style={styles.emptyText}>{t('complete_goals_and_tasks_to_unlock_achieveme')}</Text>
          </View>
        ) : (
          <>
            {unlockedAchievements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Unlocked ({unlockedAchievements.length})
                </Text>
                {unlockedAchievements.map((a) => renderAchievement(a, true))}
              </View>
            )}

            {lockedAchievements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  In Progress ({lockedAchievements.length})
                </Text>
                {lockedAchievements.map((a) => renderAchievement(a, false))}
              </View>
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'flex-start',
  },
  lockedCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  lockedIcon: {
    backgroundColor: '#F3F4F6',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  lockedText: {
    color: '#6B7280',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  rewardContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 12,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  checkmark: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    color: '#8B5CF6',
    marginTop: 8,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});
