import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';
import { t } from '../i18n';
import { type HabitProgress } from '../lib/habitProgress';
import { useTheme } from '../theme/ThemeProvider';

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function HabitProgressCard({ done, total, remaining, ratio }: HabitProgress) {
  const { isDark } = useTheme();
  const isFocused = useIsFocused();
  const [reduceMotion, setReduceMotion] = useState(true);
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');
  const scale = useRef(new Animated.Value(1)).current;
  const previousDone = useRef(done);

  useEffect(() => {
    let mounted = true;
    let receivedChange = false;
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      receivedChange = true;
      setReduceMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted && !receivedChange) setReduceMotion(enabled);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) =>
      setIsActive(state === 'active')
    );
    return () => listener.remove();
  }, []);

  useEffect(() => {
    const increased = done > previousDone.current;
    previousDone.current = done;
    scale.stopAnimation();
    scale.setValue(1);
    if (!increased || reduceMotion || !isFocused || !isActive) return;

    const animation = Animated.sequence([
      Animated.timing(scale, { toValue: 1.045, duration: 110, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 170, useNativeDriver: true }),
    ]);
    animation.start();
    return () => {
      animation.stop();
      scale.stopAnimation();
      scale.setValue(1);
    };
  }, [done, reduceMotion, isFocused, isActive, scale]);

  const colors = isDark
    ? {
        surface: '#172A24',
        border: '#355545',
        text: '#ECF7EF',
        secondary: '#BAD0C2',
        accent: '#82D4A3',
        track: '#33483D',
      }
    : {
        surface: '#F2F8F5',
        border: '#D6E9DD',
        text: '#16382A',
        secondary: '#4D6658',
        accent: '#287953',
        track: '#DDEBE2',
      };
  const count = t('progress_today_count')
    .replace('{done}', String(done))
    .replace('{total}', String(total));
  const detail =
    remaining === 0
      ? t('progress_today_complete')
      : t('progress_today_remaining').replace('{count}', String(remaining));

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID="habit-progress-card"
    >
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {t('progress_today_title')}
      </Text>
      <View style={styles.body}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${t('habits')}. ${count}`}
          accessibilityValue={{ min: 0, max: total, now: done, text: count }}
          testID="habit-progress-ring"
        >
          <Animated.View
            style={{ transform: [{ scale }] }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Svg width={92} height={92} viewBox="0 0 92 92" accessible={false}>
              <Circle
                cx={46}
                cy={46}
                r={RADIUS}
                fill="none"
                stroke={colors.track}
                strokeWidth={5}
              />
              {done > 0 && (
                <Circle
                  cx={46}
                  cy={46}
                  r={RADIUS}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
                  rotation={-90}
                  origin="46, 46"
                />
              )}
              {/* Decorative sprout drawn for this card; it does not encode a level or reward. */}
              <Path
                d="M45 64 C44 52 46 45 50 36"
                fill="none"
                stroke={colors.accent}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Path
                d="M47 48 C36 50 29 43 30 33 C42 33 49 39 47 48Z"
                fill={colors.accent}
                opacity={0.7}
              />
              <Path d="M48 41 C47 30 54 24 64 25 C63 36 58 42 48 41Z" fill={colors.accent} />
              <Path
                d="M34 65 Q46 61 58 65"
                fill="none"
                stroke={colors.accent}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.5}
              />
            </Svg>
          </Animated.View>
        </View>
        <View style={styles.metrics}>
          <Text style={[styles.count, { color: colors.text }]} testID="habit-progress-count">
            {count}
          </Text>
          <Text
            style={[styles.detail, { color: colors.secondary }]}
            testID="habit-progress-remaining"
          >
            {detail}
          </Text>
        </View>
      </View>
      <Text style={[styles.scope, { color: colors.secondary }]}>{t('progress_today_scope')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 18 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metrics: { flex: 1, minWidth: 0 },
  count: { fontSize: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
  detail: { fontSize: 14, marginTop: 7 },
  scope: { fontSize: 12, marginTop: 18, lineHeight: 18 },
});
