import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import {
  accountDeletion,
  deletionProvider,
  reauthenticateDeletion,
} from '../services/accountDeletion';
import { useGoogleAuth } from '../services/googleAuth';
import { t, type Anahtar } from '../i18n';
import { useThemedStyles } from '../theme/ThemeProvider';
import { watchDeletionProgress } from '../lib/deletionPolling';

const messages: Record<string, Anahtar> = {
  account_changed: 'deletion_account_changed',
  authentication_required: 'deletion_sign_in_required',
  recent_auth_required: 'deletion_reauth',
  apple_reauthentication_required: 'deletion_apple_required',
  deletion_retry_required: 'deletion_retrying',
  deletion_cannot_cancel: 'deletion_cannot_cancel',
  deletion_unavailable: 'deletion_unavailable',
  deletion_storage_failed: 'deletion_storage_failed',
  deletion_status_failed: 'deletion_status_failed',
  deletion_record_missing: 'deletion_record_missing',
  deletion_expired: 'deletion_expired',
  deletion_unknown: 'deletion_unknown',
};

export function AccountDeletionDialog() {
  const { user, isLoading, isDemo } = useAuthStore();
  const state = useSyncExternalStore(accountDeletion.subscribe, accountDeletion.getSnapshot);
  const [password, setPassword] = useState('');
  const google = useGoogleAuth();
  const styles = useThemedStyles(baseStyles);
  useEffect(() => {
    if (isDemo) accountDeletion.suspendView();
    else if (!isLoading) void accountDeletion.initialize(user?.uid || null);
  }, [user?.uid, isLoading, isDemo]);
  useEffect(() => {
    setPassword('');
  }, [state.open, user?.uid]);
  useEffect(() => {
    if (!isDemo && state.open && state.record)
      return watchDeletionProgress(accountDeletion, AppState);
  }, [isDemo, state.open, state.record?.idempotencyKey]);
  const job = state.record?.deletion;
  const terminal = job?.status === 'completed' || job?.status === 'cancelled';
  const sameAccount = !!user && !isDemo && (!state.record || state.record.uid === user.uid);
  const canRequest = sameAccount && !terminal && (!job || job.status === 'awaiting_apple');
  const authenticate = (session: Parameters<typeof reauthenticateDeletion>[0]) =>
    reauthenticateDeletion(session, { password, google: google.promptAsync });
  const openSubscriptions = () =>
    Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() =>
      Alert.alert(t('error'), t('could_not_open_the_link'))
    );
  const request = () =>
    Alert.alert(t('delete_account'), t('deletion_intro'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deletion_confirm'),
        style: 'destructive',
        onPress: () => {
          void accountDeletion.request(authenticate).finally(() => setPassword(''));
        },
      },
    ]);
  const errorKey = state.error ? messages[state.error] || 'deletion_reauth_failed' : null;
  // A prior request may still be running when capability or storage checks later fail.
  const safeError =
    state.record && (errorKey === 'deletion_unavailable' || errorKey === 'deletion_storage_failed')
      ? 'deletion_status_failed'
      : errorKey;
  const statusKey: Anahtar =
    job?.status === 'completed'
      ? 'deletion_completed'
      : job?.status === 'cancelled'
        ? 'deletion_cancelled'
        : job?.status === 'awaiting_apple'
          ? 'deletion_apple_required'
          : job?.status === 'retrying'
            ? 'deletion_retrying'
            : job
              ? 'deletion_pending'
              : state.record
                ? 'deletion_unknown'
                : 'deletion_intro';
  const button = (key: Anahtar, action: () => void, disabled = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={action}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{t(key)}</Text>
    </TouchableOpacity>
  );
  if (isDemo) return null;
  return (
    <>
      {!!state.record && !state.open && (
        <View style={styles.resume}>
          {button('deletion_check_status', () => void accountDeletion.open())}
        </View>
      )}
      <Modal
        visible={state.open}
        animationType="slide"
        onRequestClose={() => void accountDeletion.close()}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{t('deletion_status_title')}</Text>
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              {t(statusKey)}
            </Text>
            {!terminal && (
              <>
                <Text style={styles.text}>{t('deletion_subscription_notice')}</Text>
                {button('deletion_manage_subscriptions', openSubscriptions)}
              </>
            )}
            {safeError && (
              <Text accessibilityRole="alert" style={styles.error}>
                {t(safeError)}
              </Text>
            )}
            {(canRequest || (sameAccount && job?.canCancel)) && (
              <>
                <Text style={styles.text}>{t('deletion_reauth')}</Text>
                {deletionProvider(user) === 'password' && (
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    editable={!state.busy}
                    accessibilityLabel={t('deletion_password')}
                    placeholder={t('deletion_password')}
                    style={styles.input}
                  />
                )}
              </>
            )}
            {state.busy && (
              <Text accessibilityLiveRegion="polite" style={styles.text}>
                {t('deletion_processing')}
              </Text>
            )}
            {state.record &&
              !terminal &&
              button('deletion_check_status', () => void accountDeletion.refresh(), state.busy)}
            {canRequest &&
              button(
                state.record ? 'deletion_retry_request' : 'deletion_confirm',
                request,
                state.busy ||
                  state.available === false ||
                  (deletionProvider(user) === 'password' && !password)
              )}
            {sameAccount &&
              job?.canCancel &&
              button(
                'deletion_cancel_request',
                () => {
                  void accountDeletion.cancel(authenticate).finally(() => setPassword(''));
                },
                state.busy || (deletionProvider(user) === 'password' && !password)
              )}
            {!state.record &&
              state.available === false &&
              button('retry', () => void accountDeletion.open(), state.busy)}
            {state.error === 'deletion_expired' &&
              button('contact_support', () => {
                void Linking.openURL(
                  'https://berkemd.github.io/wristsuite/lilove/support.html'
                ).catch(() => Alert.alert(t('error'), t('could_not_open_the_link')));
              })}
            {button('close', () => void accountDeletion.close(), state.busy)}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const baseStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  text: { fontSize: 16, lineHeight: 24, color: '#374151' },
  error: { fontSize: 16, lineHeight: 24, color: '#B91C1C' },
  button: { padding: 16, borderRadius: 12, backgroundColor: '#F3F4F6' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#6D28D9', textAlign: 'center' },
  disabled: { opacity: 0.45 },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#111827',
  },
  resume: { position: 'absolute', bottom: 24, left: 24, right: 24 },
});
