import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { t } from '../../i18n';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  progress: string;
  targetOutcome: string;
  estimatedDuration?: number;
  createdAt: string;
  completedAt?: string;
}

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

function GoalCardSkeleton() {
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <SkeletonBox width="70%" height={20} />
        <SkeletonBox width={60} height={24} style={{ borderRadius: 12 }} />
      </View>
      <SkeletonBox width="90%" height={16} style={{ marginTop: 12, marginBottom: 16 }} />
      <View style={styles.goalMeta}>
        <SkeletonBox width={80} height={28} style={{ borderRadius: 14 }} />
        <SkeletonBox width={40} height={16} />
      </View>
      <SkeletonBox width="100%" height={6} style={{ marginTop: 12, borderRadius: 3 }} />
    </View>
  );
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('personal');
  const [targetOutcome, setTargetOutcome] = useState('');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setError(null);
    try {
      const data = await api.getGoals();
      setGoals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load goals:', err);
      setError(t('unable_to_load_your_goals_please_try_again'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGoals();
  };

  const openCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setCategory('personal');
    setTargetOutcome('');
    setIsModalVisible(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setCategory(goal.category);
    setTargetOutcome(goal.targetOutcome);
    setIsModalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (!title.trim()) {
      Alert.alert(t('missing_title'), t('please_enter_a_goal_title'));
      return;
    }

    try {
      const goalData = {
        title: title.trim(),
        description: description.trim(),
        category,
        targetOutcome: targetOutcome.trim(),
        ...(editingGoal ? {} : { status: 'active' as const, progress: '0' }),
      };

      if (editingGoal) {
        await api.updateGoal(editingGoal.id, goalData);
        Alert.alert(t('success'), t('goal_updated_successfully'));
      } else {
        await api.createGoal(goalData);
        Alert.alert(t('success'), t('goal_created_successfully'));
      }

      setIsModalVisible(false);
      loadGoals();
    } catch (err: any) {
      Alert.alert(t('error'), t('failed_to_save_goal_please_try_again'));
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(t('delete_goal'), `Are you sure you want to delete "${goal.title}"?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteGoal(goal.id);
            loadGoals();
          } catch (err) {
            Alert.alert(t('error'), t('failed_to_delete_goal'));
          }
        },
      },
    ]);
  };

  const getProgressPercentage = (progress: string): number => {
    const num = parseFloat(progress);
    return isNaN(num) ? 0 : Math.min(Math.max(num, 0), 100);
  };

  const getCategoryColor = (cat: string): string => {
    const colors: { [key: string]: string } = {
      personal: '#8B5CF6',
      career: '#3B82F6',
      health: '#10B981',
      finance: '#F59E0B',
      relationships: '#EC4899',
      education: '#6366F1',
    };
    return colors[cat] || '#6B7280';
  };

  const getStatusConfig = (status: string): { color: string; icon: string } => {
    const configs: { [key: string]: { color: string; icon: string } } = {
      active: { color: '#10B981', icon: 'play-circle' },
      paused: { color: '#F59E0B', icon: 'pause-circle' },
      completed: { color: '#3B82F6', icon: 'checkmark-circle' },
      abandoned: { color: '#6B7280', icon: 'close-circle' },
    };
    return configs[status] || { color: '#6B7280', icon: 'ellipse' };
  };

  const renderGoalCard = (goal: Goal) => {
    const progressPercentage = getProgressPercentage(goal.progress);
    const categoryColor = getCategoryColor(goal.category);
    const statusConfig = getStatusConfig(goal.status);

    return (
      <TouchableOpacity
        key={goal.id}
        style={styles.goalCard}
        onPress={() => openEditModal(goal)}
        onLongPress={() => handleDeleteGoal(goal)}
        activeOpacity={0.7}
        data-testid={`card-goal-${goal.id}`}
      >
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle} numberOfLines={2}>
            {goal.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{goal.status}</Text>
          </View>
        </View>

        {goal.description && (
          <Text style={styles.goalDescription} numberOfLines={2}>
            {goal.description}
          </Text>
        )}

        <View style={styles.goalMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '15' }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>{goal.category}</Text>
          </View>
          <Text style={styles.progressText}>{progressPercentage}%</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[styles.progressBar, { width: `${progressPercentage}%`, backgroundColor: categoryColor }]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const otherGoals = goals.filter((g) => g.status !== 'active' && g.status !== 'completed');

  const renderSkeletonLoading = () => (
    <View style={styles.scrollContent}>
      <View style={styles.section}>
        <SkeletonBox width={160} height={22} style={{ marginBottom: 16 }} />
        <GoalCardSkeleton />
        <GoalCardSkeleton />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="flag-outline" size={48} color="#8B5CF6" />
      </View>
      <Text style={styles.emptyStateTitle}>{t('no_goals_yet')}</Text>
      <Text style={styles.emptyStateText}>{t('start_your_journey_by_creating_your_first_go')}</Text>
      <TouchableOpacity style={styles.emptyStateButton} onPress={openCreateModal} data-testid="button-create-first-goal">
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyStateButtonText}>{t('create_your_first_goal')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.errorTitle}>{t('unable_to_load_goals')}</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadGoals} data-testid="button-retry-goals">
        <Ionicons name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>{t('try_again')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('my_goals')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal} data-testid="button-new-goal">
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>{t('new_goal')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !isRefreshing ? (
          renderSkeletonLoading()
        ) : error && goals.length === 0 ? (
          renderErrorState()
        ) : goals.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {activeGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Goals ({activeGoals.length})</Text>
                {activeGoals.map(renderGoalCard)}
              </View>
            )}

            {completedGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed ({completedGoals.length})</Text>
                {completedGoals.map(renderGoalCard)}
              </View>
            )}

            {otherGoals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Other Goals ({otherGoals.length})</Text>
                {otherGoals.map(renderGoalCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalCloseButton} data-testid="button-close-modal">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('title')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('what_do_you_want_to_achieve')}
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                data-testid="input-goal-title"
              />

              <Text style={styles.inputLabel}>{t('description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('add_more_details_about_your_goal')}
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={500}
                data-testid="input-goal-description"
              />

              <Text style={styles.inputLabel}>{t('target_outcome')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('what_does_success_look_like')}
                placeholderTextColor="#9CA3AF"
                value={targetOutcome}
                onChangeText={setTargetOutcome}
                maxLength={200}
                data-testid="input-goal-outcome"
              />

              <Text style={styles.inputLabel}>{t('category')}</Text>
              <View style={styles.categorySelector}>
                {['personal', 'career', 'health', 'finance', 'relationships', 'education'].map((cat) => {
                  const isSelected = category === cat;
                  const catColor = getCategoryColor(cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        isSelected && { backgroundColor: catColor + '15', borderColor: catColor },
                      ]}
                      onPress={() => setCategory(cat)}
                      data-testid={`button-category-${cat}`}
                    >
                      <Text style={[styles.categoryOptionText, isSelected && { color: catColor }]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsModalVisible(false)}
                  data-testid="button-cancel-goal"
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveGoal} data-testid="button-save-goal">
                  <Text style={styles.saveButtonText}>{editingGoal ? 'Update' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
  },
  goalCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  goalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  goalDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
  },
  goalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  progressText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  categoryOption: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
