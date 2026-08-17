import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MoodOption {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  description: string;
}

const moods: MoodOption[] = [
  { 
    id: 'energized', 
    name: 'Energized', 
    icon: 'flash',
    color: '#EAB308',
    bgColor: '#FEF9C3',
    description: 'Ready to take on the world'
  },
  { 
    id: 'happy', 
    name: 'Happy', 
    icon: 'sunny',
    color: '#F97316',
    bgColor: '#FED7AA',
    description: 'Feeling great today'
  },
  { 
    id: 'peaceful', 
    name: 'Peaceful', 
    icon: 'moon',
    color: '#6366F1',
    bgColor: '#E0E7FF',
    description: 'Calm and centered'
  },
  { 
    id: 'focused', 
    name: 'Focused', 
    icon: 'sparkles',
    color: '#A855F7',
    bgColor: '#F3E8FF',
    description: 'In the zone'
  },
  { 
    id: 'motivated', 
    name: 'Motivated', 
    icon: 'flame',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    description: 'Fired up and ready'
  },
  { 
    id: 'grateful', 
    name: 'Grateful', 
    icon: 'heart',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    description: 'Appreciating the moment'
  },
  { 
    id: 'neutral', 
    name: 'Neutral', 
    icon: 'cloud',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    description: 'Just being'
  },
  { 
    id: 'tired', 
    name: 'Tired', 
    icon: 'rainy',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    description: 'Need some rest'
  },
  { 
    id: 'calm', 
    name: 'Calm', 
    icon: 'snow',
    color: '#06B6D4',
    bgColor: '#CFFAFE',
    description: 'Cool and collected'
  }
];

interface MoodSelectorProps {
  currentMood?: string;
  onMoodSelect?: (mood: string) => void;
  showTitle?: boolean;
  compact?: boolean;
  isUpdating?: boolean;
}

export default function MoodSelector({ 
  currentMood, 
  onMoodSelect,
  showTitle = true,
  compact = false,
  isUpdating = false
}: MoodSelectorProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(currentMood || null);

  // Sync with currentMood prop when it changes (e.g., from async store load)
  useEffect(() => {
    if (currentMood && currentMood !== selectedMood) {
      setSelectedMood(currentMood);
    }
  }, [currentMood]);

  const handleMoodSelect = (mood: MoodOption) => {
    if (isUpdating) return;
    setSelectedMood(mood.id);
    onMoodSelect?.(mood.id);
  };

  if (compact) {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.compactContainer}
      >
        {moods.map((mood) => {
          const isSelected = selectedMood === mood.id;
          return (
            <TouchableOpacity
              key={mood.id}
              onPress={() => handleMoodSelect(mood)}
              style={[
                styles.compactButton,
                { backgroundColor: mood.bgColor },
                isSelected && styles.compactButtonSelected,
              ]}
              disabled={isUpdating}
              activeOpacity={0.7}
            >
              <Ionicons name={mood.icon} size={16} color={mood.color} />
              <Text style={[styles.compactText, { color: mood.color }]}>
                {mood.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Ionicons name="heart" size={20} color="#EC4899" />
          <Text style={styles.title}>How are you feeling today?</Text>
        </View>
      )}
      <View style={styles.grid}>
        {moods.map((mood) => {
          const isSelected = selectedMood === mood.id;
          return (
            <TouchableOpacity
              key={mood.id}
              onPress={() => handleMoodSelect(mood)}
              style={[
                styles.moodButton,
                { backgroundColor: mood.bgColor },
                isSelected && styles.moodButtonSelected,
              ]}
              disabled={isUpdating}
              activeOpacity={0.7}
            >
              <Ionicons name={mood.icon} size={28} color={mood.color} />
              <Text style={[styles.moodName, { color: mood.color }]}>
                {mood.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedMood && (
        <View style={styles.confirmationBanner}>
          <Text style={styles.confirmationText}>
            Your mood has been saved!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  moodButton: {
    width: '30%',
    minWidth: 90,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  moodButtonSelected: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
    transform: [{ scale: 1.02 }],
  },
  moodName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  compactButtonSelected: {
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  compactText: {
    fontSize: 13,
    fontWeight: '500',
  },
  confirmationBanner: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmationText: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '500',
  },
});
