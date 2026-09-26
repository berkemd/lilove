import React, { useCallback, useState, useSyncExternalStore } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  AppState,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../lib/api';
import { HabitTracker, type Habit } from '../../lib/habits';
import { t } from '../../i18n';
import { useThemedStyles, useTheme } from '../../theme/ThemeProvider';

export default function HabitsScreen() {
  const styles = useThemedStyles(baseStyles);
  const { color: themeColor } = useTheme();

  const [tracker] = useState(() => new HabitTracker(api));
  const {
    habits,
    loading: isLoading,
    saving,
    checkingId,
    error,
  } = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot);
  const busy = isLoading || saving || checkingId !== null;
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('health');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');

  const emojis = ['🎯', '💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '🧠', '❤️'];

  useFocusEffect(
    useCallback(() => {
      void tracker.refresh();
      const dayKey = () => `${new Date().toDateString()}/${new Date().toISOString().slice(0, 10)}`;
      let previousDay = dayKey();
      const clock = setInterval(() => {
        const today = dayKey();
        if (today !== previousDay) {
          previousDay = today;
          void tracker.refresh();
        }
      }, 30_000);
      const foreground = AppState.addEventListener('change', (state) => {
        if (state === 'active') void tracker.refresh();
      });
      return () => {
        clearInterval(clock);
        foreground.remove();
      };
    }, [tracker])
  );

  const openCreateModal = () => {
    setTitle('');
    setDescription('');
    setCategory('health');
    setSelectedEmoji('🎯');
    setIsModalVisible(true);
  };

  const handleSaveHabit = async () => {
    if (!title.trim()) {
      Alert.alert(t('error'), t('please_enter_a_habit_name'));
      return;
    }

    const created = await tracker.create({
      title: title.trim(),
      description: description.trim(),
      category,
      icon: selectedEmoji,
      color: getCategoryColor(category),
      frequency: 'daily',
      difficulty: 'medium',
    });
    if (created) {
      setIsModalVisible(false);
    } else if (tracker.getSnapshot().error === 'create') {
      Alert.alert(t('error'), t('failed_to_create_habit_please_try_again'));
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      health: '#10B981',
      productivity: '#3B82F6',
      learning: '#8B5CF6',
      mindfulness: '#EC4899',
      fitness: '#F59E0B',
    };
    return colors[category] || '#6B7280';
  };

  const getCategoryLabel = (category: string): string =>
    category === 'health' ? t('health') : category;

  const renderHabitCard = (habit: Habit) => {
    const categoryColor = getCategoryColor(habit.category);

    return (
      <View
        key={habit.id}
        style={[styles.habitCard, { borderLeftColor: categoryColor }]}
        testID={`habit-${habit.id}`}
      >
        <View style={styles.habitHeader}>
          <View style={styles.habitIcon}>
            {['walk', 'book', 'moon', 'star'].includes(habit.icon || '') ? (
              <Ionicons
                name={habit.icon as 'walk' | 'book' | 'moon' | 'star'}
                size={26}
                color={themeColor('#047857', 'text')}
              />
            ) : (
              <Text style={styles.habitEmoji}>{habit.icon || '🎯'}</Text>
            )}
          </View>
          <View style={styles.habitInfo}>
            <Text style={styles.habitTitle}>{habit.title}</Text>
            {habit.description && (
              <Text style={styles.habitDescription} numberOfLines={1}>
                {habit.description}
              </Text>
            )}
          </View>
          {checkingId === habit.id ? (
            <ActivityIndicator color={themeColor('#10B981', 'text')} />
          ) : (
            habit.completedToday && (
              <View style={styles.checkMark}>
                <Text style={styles.checkMarkText}>✓</Text>
              </View>
            )
          )}
        </View>

        <View style={styles.habitStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{habit.currentStreak ?? 0}</Text>
            <Text style={styles.statLabel}>{t('streak')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{habit.totalCompletions ?? 0}</Text>
            <Text style={styles.statLabel}>{t('total')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{habit.longestStreak ?? 0}</Text>
            <Text style={styles.statLabel}>{t('best')}</Text>
          </View>
        </View>

        {habit.completedToday ? (
          <Text
            style={styles.checkLabel}
            accessibilityLabel={`${habit.title}. ${t('habits_completed_today')}`}
          >
            {t('habits_completed_today')}
          </Text>
        ) : (
          <TouchableOpacity
            style={[styles.checkButton, (busy || !!error) && styles.checkButtonDisabled]}
            onPress={() => void tracker.check(habit.id)}
            disabled={busy || !!error}
            accessibilityRole="button"
            accessibilityLabel={`${habit.title}. ${checkingId === habit.id ? t('habits_checking') : t('habits_check')}`}
            accessibilityState={{ disabled: busy || !!error, busy: checkingId === habit.id }}
            testID={`check-habit-${habit.id}`}
          >
            <Text
              style={[styles.checkButtonText, (busy || !!error) && styles.checkButtonTextDisabled]}
            >
              {checkingId === habit.id ? t('habits_checking') : t('habits_check')}
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: themeColor(categoryColor, 'text') }]}>
            {getCategoryLabel(habit.category)}
          </Text>
        </View>
      </View>
    );
  };

  const visibleHabits = habits.filter((h) => h.isActive !== false && !h.isPaused);
  const activeHabits = visibleHabits.filter((h) => !h.completedToday);
  const completedToday = visibleHabits.filter((h) => h.completedToday);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('my_habits')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}
          disabled={busy}
          accessibilityRole="button"
          testID="new-habit"
        >
          <Text style={styles.addButtonText}>+ {t('create_habit')}</Text>
        </TouchableOpacity>
      </View>

      {/* Habits List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && habits.length > 0}
            onRefresh={() => void tracker.refresh()}
          />
        }
      >
        {error && (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>
              {error === 'check'
                ? t('habits_check_failed')
                : error === 'create'
                  ? t('failed_to_create_habit_please_try_again')
                  : t('habits_load_failed')}
            </Text>
            <TouchableOpacity
              onPress={() => void tracker.refresh()}
              disabled={busy}
              accessibilityRole="button"
              testID="retry-habits"
            >
              <Text style={styles.checkLabel}>{t('try_again')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {isLoading && habits.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor('#10B981', 'text')} />
            <Text style={styles.loadingText}>{t('loading_your_habits')}</Text>
          </View>
        ) : (
          <>
            {activeHabits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('habits_today')} ({activeHabits.length})
                </Text>
                {activeHabits.map(renderHabitCard)}
              </View>
            )}

            {completedToday.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('habits_completed_today')} ({completedToday.length})
                </Text>
                {completedToday.map(renderHabitCard)}
              </View>
            )}

            {visibleHabits.length === 0 && !isLoading && !error && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🌱</Text>
                <Text style={styles.emptyStateTitle}>{t('no_habits_yet')}</Text>
                <Text style={styles.emptyStateText}>
                  {t('create_your_first_habit_and_start_building_a')}
                </Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={openCreateModal}>
                  <Text style={styles.emptyStateButtonText}>{t('create_habit')}</Text>
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
        onRequestClose={() => {
          if (!saving) setIsModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{t('create_new_habit')}</Text>

            <View style={styles.emojiSelector}>
              {emojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiOption,
                    selectedEmoji === emoji && styles.emojiOptionSelected,
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { color: themeColor('#111827', 'text') }]}
              placeholder={t('habit_name')}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              testID="habit-title"
              accessibilityLabel={t('habit_name')}
              placeholderTextColor={themeColor('#9CA3AF', 'text')}
            />

            <TextInput
              style={[[styles.input, styles.textArea], { color: themeColor('#111827', 'text') }]}
              placeholder={t('description_optional')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              maxLength={200}
              placeholderTextColor={themeColor('#9CA3AF', 'text')}
            />

            <View style={styles.categorySelector}>
              {['health', 'productivity', 'learning', 'mindfulness', 'fitness'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionSelected,
                    { borderColor: getCategoryColor(cat) },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === cat && { color: themeColor(getCategoryColor(cat), 'text') },
                    ]}
                  >
                    {getCategoryLabel(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveHabit}
                disabled={busy}
                testID="save-habit"
              >
                <Text style={styles.saveButtonText}>
                  {saving ? t('habits_checking') : t('create')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  checkButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#047857',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  checkButtonDisabled: {
    backgroundColor: '#D1FAE5',
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkButtonTextDisabled: {
    color: '#065F46',
  },
  checkLabel: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    marginBottom: 16,
  },
  errorText: { color: '#991B1B', fontSize: 15 },
  container: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  headerTitle: {
    flex: 1,
    marginRight: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    maxWidth: '46%',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    textAlign: 'center',
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
  habitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitEmoji: {
    fontSize: 24,
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  habitDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  habitStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
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
    backgroundColor: '#10B981',
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
  emojiSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  emojiText: {
    fontSize: 24,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryOption: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryOptionSelected: {
    backgroundColor: '#F0FDF4',
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
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
