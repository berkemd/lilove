import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { t } from '../../i18n';
import { useThemedStyles, useTheme } from '../../theme/ThemeProvider';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  goalId?: string;
  estimatedDuration?: number;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
}

interface TaskGoal {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
}

const priorityLabels = {
  low: 'task_priority_low',
  medium: 'task_priority_medium',
  high: 'task_priority_high',
  urgent: 'task_priority_urgent',
} as const;
const statusLabels = {
  pending: 'task_status_pending',
  active: 'goal_status_active',
  completed: 'completed',
  skipped: 'task_status_skipped',
  blocked: 'task_status_blocked',
  cancelled: 'task_status_cancelled',
} as const;

export default function TasksScreen() {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'Tasks'>>();
  const styles = useThemedStyles(baseStyles);
  const { color: themeColor } = useTheme();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [goals, setGoals] = useState<TaskGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsFailed, setGoalsFailed] = useState(false);
  const [goalId, setGoalId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = React.useRef(false);
  const resumeForm = React.useRef(false);
  const pendingGoalNavigation = React.useRef(false);
  const session = React.useRef(0);
  const active = React.useRef(false);
  const taskRead = React.useRef(0);
  const goalRead = React.useRef(0);
  const captureSession = () => {
    const revision = session.current;
    return () => active.current && session.current === revision;
  };

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');

  React.useEffect(() => {
    let owner = useAuthStore.getState();
    const reset = () => {
      session.current++;
      active.current = owner.isAuthenticated && (owner.isDemo || !!owner.user);
      saving.current = false;
      resumeForm.current = false;
      pendingGoalNavigation.current = false;
      setTasks([]);
      setGoals([]);
      setGoalId('');
      setTitle('');
      setDescription('');
      setPriority('medium');
      setIsModalVisible(false);
      setIsSaving(false);
      setIsRefreshing(false);
      setLoadFailed(false);
      setGoalsFailed(false);
      if (active.current) {
        void loadTasks();
        void loadGoals();
      } else {
        setIsLoading(false);
        setGoalsLoading(false);
      }
    };
    const unsubscribe = useAuthStore.subscribe((next) => {
      if (
        next.user !== owner.user ||
        next.isDemo !== owner.isDemo ||
        next.isAuthenticated !== owner.isAuthenticated
      ) {
        owner = next;
        reset();
      }
    });
    reset();
    const unfocus = navigation.addListener('focus', () => {
      if (!active.current) return;
      if (resumeForm.current) {
        resumeForm.current = false;
        setIsModalVisible(true);
      }
      void loadGoals();
    });
    return () => {
      active.current = false;
      session.current++;
      unsubscribe();
      unfocus();
    };
  }, [navigation]);

  const loadGoals = async () => {
    const current = captureSession();
    if (!current()) return;
    const request = ++goalRead.current;
    setGoalsLoading(true);
    setGoalsFailed(false);
    try {
      const data = await api.getGoals();
      if (
        !Array.isArray(data) ||
        !data.every(
          (goal) =>
            goal &&
            typeof goal.id === 'string' &&
            goal.id.length > 0 &&
            typeof goal.title === 'string' &&
            goal.title.trim().length > 0 &&
            ['active', 'paused', 'completed', 'abandoned'].includes(goal.status)
        )
      ) {
        throw new Error('Invalid goal response');
      }
      if (!current() || request !== goalRead.current) return;
      const choices = data.filter((goal) => goal.status === 'active');
      setGoals(choices);
      setGoalId((selected) => (choices.some((goal) => goal.id === selected) ? selected : ''));
    } catch {
      if (current() && request === goalRead.current) {
        setGoals([]);
        setGoalsFailed(true);
      }
    } finally {
      if (current() && request === goalRead.current) setGoalsLoading(false);
    }
  };

  const loadTasks = async () => {
    const current = captureSession();
    if (!current()) return;
    const request = ++taskRead.current;
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const data = (await api.getTasks()) as { tasks?: Task[]; totalCount?: number } | null;
      if (
        !Array.isArray(data?.tasks) ||
        typeof data.totalCount !== 'number' ||
        !Number.isSafeInteger(data.totalCount) ||
        data.totalCount < data.tasks.length ||
        (data.totalCount > 0 && data.tasks.length === 0) ||
        !data.tasks.every(
          (task) =>
            task &&
            typeof task.id === 'string' &&
            typeof task.title === 'string' &&
            ['pending', 'active', 'completed', 'skipped', 'blocked', 'cancelled'].includes(
              task.status
            )
        )
      ) {
        throw new Error('Invalid task page');
      }
      if (current() && request === taskRead.current) setTasks(data.tasks);
    } catch {
      if (current() && request === taskRead.current) setLoadFailed(true);
    } finally {
      if (current() && request === taskRead.current) setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    const current = captureSession();
    setIsRefreshing(true);
    await loadTasks();
    if (current()) setIsRefreshing(false);
  };

  const openCreateModal = () => {
    if (!active.current) return;
    setIsModalVisible(true);
    void loadGoals();
  };

  const handleSaveTask = async () => {
    const current = captureSession();
    if (!current() || saving.current) return;
    if (goalsLoading || goalsFailed || !goals.some((goal) => goal.id === goalId)) {
      Alert.alert(t('error'), t('task_select_goal'));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t('error'), t('please_enter_a_task_title'));
      return;
    }

    saving.current = true;
    setIsSaving(true);
    try {
      await api.createTask({
        goalId,
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'pending',
      });

      if (!current()) return;
      setTitle('');
      setDescription('');
      setPriority('medium');
      setGoalId('');
      setIsModalVisible(false);
      Alert.alert(t('success'), t('task_created_successfully'));
      loadTasks();
    } catch (error: any) {
      if (!current()) return;
      Alert.alert(
        t('error'),
        t(
          error?.outcomeUnknown
            ? 'request_outcome_unknown'
            : 'failed_to_create_task_please_try_again'
        )
      );
    } finally {
      if (current()) {
        saving.current = false;
        setIsSaving(false);
      }
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const current = captureSession();
    if (!current()) return;
    try {
      await api.completeTask(taskId);
      if (!current()) return;
      loadTasks();
      Alert.alert(t('well_done'), t('task_completed_successfully'));
    } catch (error: any) {
      if (!current()) return;
      Alert.alert(
        t('error'),
        t(
          error?.outcomeUnknown
            ? 'request_outcome_unknown'
            : 'failed_to_complete_task_please_try_again'
        )
      );
    }
  };

  const getPriorityColor = (priority: string): string => {
    const colors: { [key: string]: string } = {
      low: '#10B981',
      medium: '#3B82F6',
      high: '#F59E0B',
      urgent: '#EF4444',
    };
    return colors[priority] || '#6B7280';
  };

  const renderTaskCard = (task: Task) => {
    const priorityColor = getPriorityColor(task.priority);
    const isCompleted = task.status === 'completed';

    return (
      <TouchableOpacity
        key={task.id}
        style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
        onPress={() => !isCompleted && handleCompleteTask(task.id)}
        disabled={isCompleted}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
              {task.title}
            </Text>
            {task.description && (
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
              </Text>
            )}
          </View>
          {isCompleted ? (
            <View style={styles.checkMark}>
              <Text style={styles.checkMarkText}>✓</Text>
            </View>
          ) : (
            <View style={[styles.checkBox, { borderColor: priorityColor }]} />
          )}
        </View>

        <View style={styles.taskFooter}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
            <Text style={[styles.priorityText, { color: themeColor(priorityColor, 'text') }]}>
              {t(priorityLabels[task.priority])}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
            <Text style={styles.statusText}>{t(statusLabels[task.status])}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      pending: '#9CA3AF',
      active: '#3B82F6',
      completed: '#10B981',
      skipped: '#F59E0B',
      blocked: '#EF4444',
      cancelled: '#6B7280',
    };
    return colors[status] || '#6B7280';
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const activeTasks = tasks.filter((t) => t.status === 'active');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('my_tasks')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}
          testID="button-new-task"
        >
          <Text style={styles.addButtonText}>{t('create_task')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor('#3B82F6', 'text')} />
            <Text style={styles.loadingText}>{t('loading_your_tasks')}</Text>
          </View>
        ) : loadFailed ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('could_not_load_tasks_please_try_again')}</Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={loadTasks}
              accessibilityRole="button"
              testID="button-retry-tasks"
            >
              <Text style={styles.emptyStateButtonText}>{t('try_again')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('task_status_pending')} ({pendingTasks.length})
                </Text>
                {pendingTasks.map(renderTaskCard)}
              </View>
            )}

            {activeTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('goal_status_active')} ({activeTasks.length})
                </Text>
                {activeTasks.map(renderTaskCard)}
              </View>
            )}

            {completedTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('completed')} ({completedTasks.length})
                </Text>
                {completedTasks.map(renderTaskCard)}
              </View>
            )}

            {tasks.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>📋</Text>
                <Text style={styles.emptyStateTitle}>{t('no_tasks_yet')}</Text>
                <Text style={styles.emptyStateText}>
                  {t('create_your_first_task_and_get_things_done')}
                </Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={openCreateModal}>
                  <Text style={styles.emptyStateButtonText}>{t('create_task')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !saving.current && setIsModalVisible(false)}
        onDismiss={() => {
          if (!pendingGoalNavigation.current || !active.current) return;
          pendingGoalNavigation.current = false;
          navigation.navigate('TaskGoal', { createForTask: true });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{t('create_new_task')}</Text>
              <Text style={styles.sectionTitle}>{t('task_select_goal')}</Text>
              {goalsLoading ? (
                <ActivityIndicator testID="task-goals-loading" />
              ) : goalsFailed ? (
                <View>
                  <Text style={styles.emptyStateText}>
                    {t('unable_to_load_your_goals_please_try_again')}
                  </Text>
                  <TouchableOpacity onPress={loadGoals} testID="button-retry-task-goals">
                    <Text style={styles.sectionTitle}>{t('try_again')}</Text>
                  </TouchableOpacity>
                </View>
              ) : goals.length === 0 ? (
                <View>
                  <Text style={styles.emptyStateText}>{t('task_no_active_goals')}</Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    testID="button-create-task-goal"
                    onPress={() => {
                      resumeForm.current = true;
                      pendingGoalNavigation.current = Platform.OS === 'ios';
                      setIsModalVisible(false);
                      if (Platform.OS !== 'ios')
                        navigation.navigate('TaskGoal', { createForTask: true });
                    }}
                  >
                    <Text style={styles.emptyStateButtonText}>{t('new_goal')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                goals.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    testID={`task-goal-${goal.id}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: goalId === goal.id, disabled: isSaving }}
                    disabled={isSaving}
                    style={[styles.input, goalId === goal.id && styles.priorityOptionSelected]}
                    onPress={() => setGoalId(goal.id)}
                  >
                    <Text style={styles.taskTitle}>{goal.title}</Text>
                  </TouchableOpacity>
                ))
              )}

              <TextInput
                style={[styles.input, { color: themeColor('#111827', 'text') }]}
                placeholder={t('task_title')}
                value={title}
                editable={!isSaving}
                onChangeText={setTitle}
                maxLength={200}
                placeholderTextColor={themeColor('#9CA3AF', 'text')}
              />

              <TextInput
                style={[[styles.input, styles.textArea], { color: themeColor('#111827', 'text') }]}
                placeholder={t('description_optional')}
                value={description}
                editable={!isSaving}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={500}
                placeholderTextColor={themeColor('#9CA3AF', 'text')}
              />

              <View style={styles.prioritySelector}>
                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                  <TouchableOpacity
                    key={t(priorityLabels[p])}
                    style={[
                      styles.priorityOption,
                      priority === p && styles.priorityOptionSelected,
                      { borderColor: getPriorityColor(p) },
                    ]}
                    disabled={isSaving}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        priority === p && { color: themeColor(getPriorityColor(p), 'text') },
                      ]}
                    >
                      {t(priorityLabels[p])}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  disabled={isSaving}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  testID="button-save-task"
                  disabled={
                    isSaving ||
                    goalsLoading ||
                    goalsFailed ||
                    !goals.some((goal) => goal.id === goalId)
                  }
                  onPress={handleSaveTask}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('create')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  priorityOption: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  priorityOptionSelected: {
    backgroundColor: '#F8FAFC',
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
