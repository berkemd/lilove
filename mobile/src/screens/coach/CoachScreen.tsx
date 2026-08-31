import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { t } from '../../i18n';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface DailyInsight {
  insight?: string;
  motivation?: string;
  focusArea?: string;
  challenge?: string;
}

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [dailyInsight, setDailyInsight] = useState<DailyInsight | null>(null);
  const [insightError, setInsightError] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initConversation();
    loadDailyInsight();
  }, []);

  // Gun-sifir anayasasi (LILOVE_KOC_GUN_SIFIR.md): veri yoksa tavsiye yok —
  // koc ilk sayiyi yaratir. Kayit bos degilse (veya olculemezse) normal karsilama.
  const initConversation = async () => {
    let recordEmpty = false;
    try {
      const habits = await api.getHabits();
      recordEmpty = Array.isArray(habits) && habits.length === 0;
    } catch {
      recordEmpty = false;
    }
    if (recordEmpty) {
      setMessages([
        { id: '1', type: 'ai', content: t('coach_d0_intro'), timestamp: new Date() },
        { id: '2', type: 'ai', content: t('coach_d0_ask_habit'), timestamp: new Date() },
      ]);
      return;
    }
    setMessages([{
      id: '1',
      type: 'ai',
      content: t('coach_welcome_message'),
      timestamp: new Date(),
      suggestions: [t('coach_suggestion_goals'), t('coach_suggestion_motivation'), t('coach_suggestion_progress'), t('coach_suggestion_wellness')],
    }]);
  };

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadDailyInsight = async () => {
    setIsLoadingInsight(true);
    setInsightError(false);
    try {
      const insight = await api.getDailyInsight();
      setDailyInsight(insight);
    } catch (err: any) {
      console.log('Could not load daily insight:', err.message);
      setInsightError(true);
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.getCoachResponse(text.trim());

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response || response.message || "I'm here to help! Let's work on this together.",
        timestamp: new Date(),
        suggestions: response.suggestions,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        // SEBEBI UYDURMA. Demo turunda sunucuya hic gidilmiyor; "baglanti
        // sorunu" demek kullaniciya da, App Review'a da yanlis bilgi verir.
        content:
          err?.code === 'DEMO_MODE'
            ? err.message
            : "I'm having trouble connecting right now. Please check your connection and try again.",
        timestamp: new Date(),
        suggestions:
          err?.code === 'DEMO_MODE'
            ? ['Check my goals', 'View my progress']
            : ['Try again', 'Check my goals', 'View my progress'],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';

    return (
      <View key={message.id} style={styles.messageContainer}>
        {!isUser && (
          <View style={styles.aiAvatarContainer}>
            <Ionicons name="sparkles" size={16} color="#8B5CF6" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>{message.content}</Text>
        </View>

        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {message.suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(suggestion)}
                disabled={isLoading}
                activeOpacity={0.7}
                data-testid={`button-suggestion-${index}`}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderInsightCard = () => {
    if (isLoadingInsight) {
      return (
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.insightTitle}>{t('loading_today_s_insight')}</Text>
          </View>
          <View style={styles.insightSkeletonContainer}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '80%' }]} />
          </View>
        </View>
      );
    }

    if (insightError) {
      return (
        <TouchableOpacity style={styles.insightCard} onPress={loadDailyInsight} activeOpacity={0.7}>
          <View style={styles.insightHeader}>
            <Ionicons name="refresh" size={20} color="#6B7280" />
            <Text style={[styles.insightTitle, { color: '#6B7280' }]}>{t('tap_to_load_today_s_insight')}</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (dailyInsight) {
      return (
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
            <Text style={styles.insightTitle}>{t('today_s_insight')}</Text>
          </View>
          <Text style={styles.insightText}>{dailyInsight.insight}</Text>
          {dailyInsight.motivation && <Text style={styles.insightMotivation}>"{dailyInsight.motivation}"</Text>}
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>LiLove</Text>
              <Text style={styles.headerSubtitle}>{t('your_personal_growth_companion')}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          refreshControl={
            <RefreshControl refreshing={isLoadingInsight} onRefresh={loadDailyInsight} tintColor="#8B5CF6" colors={['#8B5CF6']} />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderInsightCard()}

          {messages.map(renderMessage)}

          {isLoading && (
            <View style={styles.typingIndicator}>
              <View style={styles.aiAvatarContainer}>
                <Ionicons name="sparkles" size={16} color="#8B5CF6" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.typingText}>{t('lily_is_thinking')}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputMessage}
              onChangeText={setInputMessage}
              placeholder={t('type_your_message')}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              editable={!isLoading}
              data-testid="input-coach-message"
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!inputMessage.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isLoading}
            activeOpacity={0.7}
            data-testid="button-send-message"
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  insightText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  insightMotivation: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  insightSkeletonContainer: {
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: '100%',
  },
  messageContainer: {
    marginBottom: 16,
  },
  aiAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#111827',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingLeft: 40,
  },
  suggestionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  typingIndicator: {
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    gap: 10,
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
});
