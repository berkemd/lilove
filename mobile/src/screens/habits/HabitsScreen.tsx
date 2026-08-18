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
} from 'react-native';
import { api } from '../../lib/api';
import { t } from '../../i18n';

interface Habit {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  category: string;
  frequency: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completedToday?: boolean;
  createdAt: string;
}

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('health');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');

  const emojis = ['🎯', '💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '🧠', '❤️'];

  React.useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    setIsLoading(true);
    try {
      const data = await api.getHabits();
      setHabits(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load habits:', error);
      Alert.alert(t('error'), t('could_not_load_habits_please_try_again'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadHabits();
    setIsRefreshing(false);
  };

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

    try {
      await api.createHabit({
        title: title.trim(),
        description: description.trim(),
        category,
        icon: selectedEmoji,
        color: getCategoryColor(category),
        frequency: 'daily',
        difficulty: 'medium',
      });

      setIsModalVisible(false);
      Alert.alert(t('success'), t('habit_created_successfully'));
      loadHabits();
    } catch (error: any) {
      Alert.alert(t('error'), t('failed_to_create_habit_please_try_again'));
    }
  };

  const handleTrackHabit = async (habitId: string) => {
    try {
      await api.trackHabit(habitId);
      loadHabits();
      Alert.alert(t('great_job'), t('habit_tracked_successfully_keep_it_up'));
    } catch (error: any) {
      Alert.alert(t('error'), t('failed_to_track_habit_please_try_again'));
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

  const renderHabitCard = (habit: Habit) => {
    const categoryColor = getCategoryColor(habit.category);

    return (
      <TouchableOpacity
        key={habit.id}
        style={[styles.habitCard, { borderLeftColor: categoryColor }]}
        onPress={() => handleTrackHabit(habit.id)}
        disabled={habit.completedToday}
      >
        <View style={styles.habitHeader}>
          <View style={styles.habitIcon}>
            <Text style={styles.habitEmoji}>{habit.icon || '🎯'}</Text>
          </View>
          <View style={styles.habitInfo}>
            <Text style={styles.habitTitle}>{habit.title}</Text>
            {habit.description && (
              <Text style={styles.habitDescription} numberOfLines={1}>
                {habit.description}
              </Text>
            )}
          </View>
          {habit.completedToday && (
            <View style={styles.checkMark}>
              <Text style={styles.checkMarkText}>✓</Text>
            </View>
          )}
        </View>

        <View style={styles.habitStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{habit.currentStreak}</Text>
            <Text style={styles.statLabel}>{t('streak')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{habit.totalCompletions}</Text>
            <Text style={styles.statLabel}>{t('total')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{habit.longestStreak}</Text>
            <Text style={styles.statLabel}>{t('best')}</Text>
          </View>
        </View>

        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {habit.category}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const activeHabits = habits.filter(h => !h.completedToday);
  const completedToday = habits.filter(h => h.completedToday);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('my_habits')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>+ New Habit</Text>
        </TouchableOpacity>
      </View>

      {/* Habits List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>{t('loading_your_habits')}</Text>
          </View>
        ) : (
          <>
            {activeHabits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today's Habits ({activeHabits.length})</Text>
                {activeHabits.map(renderHabitCard)}
              </View>
            )}

            {completedToday.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed Today ({completedToday.length})</Text>
                {completedToday.map(renderHabitCard)}
              </View>
            )}

            {habits.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🌱</Text>
                <Text style={styles.emptyStateTitle}>{t('no_habits_yet')}</Text>
                <Text style={styles.emptyStateText}>{t('create_your_first_habit_and_start_building_a')}</Text>
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
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('create_new_habit')}</Text>

            <View style={styles.emojiSelector}>
              {emojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiOption,
                    selectedEmoji === emoji && styles.emojiOptionSelected
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder={t('habit_name')}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('description_optional')}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
              maxLength={200}
            />

            <View style={styles.categorySelector}>
              {['health', 'productivity', 'learning', 'mindfulness', 'fitness'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionSelected,
                    { borderColor: getCategoryColor(cat) }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === cat && { color: getCategoryColor(cat) }
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveHabit}
              >
                <Text style={styles.saveButtonText}>{t('create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#10B981',
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
