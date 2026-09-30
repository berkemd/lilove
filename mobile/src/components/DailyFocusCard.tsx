import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDailyFocus } from '../hooks/useDailyFocus';
import { dil, t } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { formatFocusDay } from '../lib/focusDate';

export default function DailyFocusCard({
  onGoals,
  onTasks,
}: {
  onGoals: () => void;
  onTasks: () => void;
}) {
  const focus = useDailyFocus();
  const { isDark } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const colors = isDark
    ? {
        background: '#172A24',
        border: '#355545',
        text: '#ECF7EF',
        secondary: '#BAD0C2',
        accent: '#82D4A3',
        buttonText: '#142C20',
        inset: '#253E31',
      }
    : {
        background: '#F2F8F5',
        border: '#D6E9DD',
        text: '#16382A',
        secondary: '#4D6658',
        accent: '#287953',
        buttonText: '#FFFFFF',
        inset: '#E1EEE6',
      };
  const overview = focus.status === 'error' || focus.needsRefresh ? null : focus.overview;
  const goal = overview?.goals.find((item) => item.id === focus.selectedGoalId);
  const busy = focus.status === 'loading' || focus.completing;
  const button = (
    label: string,
    onPress: () => void,
    id: string,
    primary = false,
    disabled = false
  ) => (
    <TouchableOpacity
      testID={id}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: primary ? colors.accent : colors.inset, opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? colors.buttonText : colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View
      style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}
      testID="daily-focus-card"
    >
      <View style={styles.heading}>
        <Ionicons name="leaf-outline" size={21} color={colors.accent} accessible={false} />
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
          {t('focus_title')}
        </Text>
        {busy && (
          <ActivityIndicator color={colors.accent} accessibilityLabel={t('loading_your_tasks')} />
        )}
      </View>
      {focus.status === 'error' && (
        <Text accessibilityLiveRegion="polite" style={[styles.detail, { color: colors.text }]}>
          {t('something_went_wrong')}
        </Text>
      )}
      {focus.needsRefresh && (
        <Text accessibilityLiveRegion="polite" style={[styles.detail, { color: colors.text }]}>
          {t('request_outcome_unknown')}
        </Text>
      )}
      {(focus.status === 'error' || focus.needsRefresh) &&
        button(t('try_again'), () => void focus.refresh(), 'focus-refresh', false, busy)}
      {overview && (
        <>
          {overview.goals.length === 0 ? (
            <>
              <Text style={[styles.detail, { color: colors.secondary }]}>
                {t('focus_no_goals')}
              </Text>
              {button(t('view_my_goals'), onGoals, 'focus-create-goal', true)}
            </>
          ) : (
            <>
              {!goal && (
                <Text style={[styles.detail, { color: colors.secondary }]}>
                  {t('focus_choose_goal')}
                </Text>
              )}
              {goal && (
                <>
                  <Text style={[styles.goal, { color: colors.text }]} testID="focus-goal-title">
                    {goal.title}
                  </Text>
                  {!!goal.targetOutcome && (
                    <Text style={[styles.detail, { color: colors.secondary }]}>
                      {t('target_outcome')}: {goal.targetOutcome}
                    </Text>
                  )}
                  {button(
                    t('focus_change_goal'),
                    () => setChoosing(!choosing),
                    'focus-change-goal',
                    false,
                    busy
                  )}
                </>
              )}
              {(!goal || choosing) && (
                <View style={styles.choices}>
                  {overview.goals.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      testID={`focus-goal-${item.id}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: item.id === goal?.id, disabled: busy }}
                      disabled={busy}
                      onPress={() => {
                        setChoosing(false);
                        void focus.select(item.id);
                      }}
                      style={[styles.choice, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.detail, { color: colors.text }]}>{item.title}</Text>
                      <Ionicons
                        name={item.id === goal?.id ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={colors.accent}
                        accessible={false}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {goal && (
                <>
                  {overview.nextTask ? (
                    <View style={[styles.task, { backgroundColor: colors.inset }]}>
                      <Text
                        style={[styles.taskTitle, { color: colors.text }]}
                        testID="focus-task-title"
                      >
                        {overview.nextTask.title}
                      </Text>
                      {!!overview.nextTask.description && (
                        <Text style={[styles.detail, { color: colors.secondary }]}>
                          {overview.nextTask.description}
                        </Text>
                      )}
                      {button(
                        t('focus_complete'),
                        () => void focus.complete(),
                        'focus-complete',
                        true,
                        busy || focus.needsRefresh || focus.status !== 'ready'
                      )}
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.detail, { color: colors.secondary }]}>
                        {t('focus_no_task')}
                      </Text>
                      {button(t('focus_add_task'), onTasks, 'focus-add-task', true)}
                    </>
                  )}
                  <Text
                    accessibilityRole="header"
                    style={[styles.weekTitle, { color: colors.text }]}
                  >
                    {t('focus_week')}
                  </Text>
                  <View style={styles.days}>
                    {overview.days.map((day) => {
                      const date = formatFocusDay(day.date, dil);

                      return (
                        <View
                          key={day.date}
                          accessible
                          accessibilityLabel={t('focus_day_count')
                            .replace('{date}', date.accessible)
                            .replace('{count}', String(day.completed))}
                          style={[styles.day, { backgroundColor: colors.inset }]}
                        >
                          <Text style={[styles.dayDate, { color: colors.secondary }]}>
                            {date.visible}
                          </Text>
                          <Text style={[styles.dayCount, { color: colors.text }]}>
                            {day.completed}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <Text
                    style={[styles.detail, { color: colors.secondary }]}
                    testID="focus-week-count"
                  >
                    {t('focus_week_count')
                      .replace('{count}', String(overview.summary!.completedTasks))
                      .replace('{days}', String(overview.summary!.activeDays))}
                  </Text>
                  {overview.days[5]?.completed === 0 && (
                    <Text style={[styles.detail, { color: colors.secondary }]}>
                      {t('focus_restart')}
                    </Text>
                  )}
                  {button(t('my_tasks'), onTasks, 'focus-view-tasks')}
                </>
              )}
            </>
          )}
        </>
      )}
      {focus.fallback && (
        <Text style={[styles.detail, { color: colors.secondary }]}>{t('focus_utc')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 24, padding: 18, borderRadius: 20, borderWidth: 1, gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { fontSize: 19, fontWeight: '700', flex: 1 },
  goal: { fontSize: 20, fontWeight: '700' },
  detail: { fontSize: 14, lineHeight: 21, flexShrink: 1 },
  button: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  choices: { gap: 8 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
  },
  task: { borderRadius: 14, padding: 14, gap: 12 },
  taskTitle: { fontSize: 18, fontWeight: '600', lineHeight: 25 },
  weekTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  day: {
    flexGrow: 1,
    minWidth: 40,
    flexBasis: 40,
    alignItems: 'center',
    borderRadius: 10,
    padding: 8,
  },
  dayDate: { fontSize: 12, textAlign: 'center' },
  dayCount: { fontSize: 18, fontWeight: '700', marginTop: 5 },
});
