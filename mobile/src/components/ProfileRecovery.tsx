import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';

type Props = {
  pending: boolean;
  onRetry: () => void;
  onLogout: () => void;
};

export function ProfileRecovery({ pending, onRetry, onLogout }: Props) {
  const styles = useThemedStyles(baseStyles);
  const { color } = useTheme();
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">
            {t(pending ? 'profile_loading' : 'profile_unavailable_title')}
          </Text>
          {pending ? (
            <ActivityIndicator color={color('#8B5CF6', 'text')} />
          ) : (
            <Text style={styles.body}>{t('profile_unavailable_body')}</Text>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={onRetry}
            disabled={pending}
            accessibilityRole="button"
            accessibilityState={{ disabled: pending }}
          >
            <Text style={[styles.buttonText, pending && styles.disabled]}>{t('try_again')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={onLogout} accessibilityRole="button">
            <Text style={styles.buttonText}>{t('log_out')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16 },
  title: { fontSize: 22, fontWeight: '600', color: '#111827', textAlign: 'center' },
  body: { fontSize: 16, color: '#4B5563', textAlign: 'center', lineHeight: 24 },
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#7C3AED', textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
