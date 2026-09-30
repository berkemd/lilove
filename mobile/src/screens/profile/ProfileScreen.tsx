import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { captureAccountSession, useAuthStore } from '../../store/authStore';
import storage from '../../services/storage';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import api, { resolveProfilePhotoUrl } from '../../lib/api';
import { updateUserProfile } from '../../lib/firebase';
import { t } from '../../i18n';
import { useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { useSubscription } from '../../hooks/useSubscription';
import { useCoinBalance } from '../../hooks/useCoinBalance';
import { areNewSubscriptionsAvailable } from '../../lib/subscriptionAvailability';
import { readUserStats, type UserStats } from '../../lib/userStats';

function SkeletonBox({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: any;
}) {
  const { color: themeColor } = useTheme();

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: themeColor('#E5E7EB', 'background'),
          borderRadius: 8,
        },
        style,
      ]}
    />
  );
}

export default function ProfileScreen({ navigation }: any) {
  const styles = useThemedStyles(baseStyles);
  const { color: themeColor } = useTheme();

  const { user, userProfile, logout, isDemo } = useAuthStore();
  const subscription = useSubscription();
  const coins = useCoinBalance();
  const imageOperation = useRef<{ isCurrent: () => boolean } | null>(null);
  const mounted = useRef(true);
  const [uploadingFor, setUploadingFor] = useState<{ isCurrent: () => boolean } | null>(null);
  const isUploadingImage = uploadingFor?.isCurrent() ?? false;
  const profilePhotoUrl = resolveProfilePhotoUrl(userProfile?.photoURL);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserStats();
    }, [])
  );

  const loadUserStats = async () => {
    setStatsError(false);
    setIsLoadingStats(true);
    try {
      setUserStats(readUserStats(await api.getUserStats()));
    } catch {
      setUserStats(null);
      setStatsError(true);
    } finally {
      setIsLoadingStats(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void coins.refresh();
    loadUserStats();
  };

  const handleLogout = () => {
    Alert.alert(t('log_out'), t('are_you_sure_you_want_to_log_out'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('log_out'),
        onPress: async () => {
          await logout();
          await storage.clear();
        },
        style: 'destructive',
      },
    ]);
  };

  const handleImagePick = async () => {
    if (imageOperation.current?.isCurrent()) return;
    if (isDemo) {
      Alert.alert(t('error'), t('not_available_in_demo_mode'));
      return;
    }
    let account: ReturnType<typeof captureAccountSession>;
    try {
      account = captureAccountSession();
    } catch {
      return;
    }
    const operation: { isCurrent: () => boolean } = {
      isCurrent: () =>
        mounted.current && imageOperation.current === operation && account.isCurrent(),
    };
    imageOperation.current = operation;
    setUploadingFor(operation);
    let uploaded = false;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!operation.isCurrent()) return;
      if (!permission.granted) {
        Alert.alert(t('permission_required'), t('please_allow_access_to_your_photo_library_to'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!operation.isCurrent() || result.canceled || !result.assets[0]) return;
      const token = await account.user.getIdToken();
      if (!operation.isCurrent()) return;
      const response = await api.uploadProfilePicture(result.assets[0], token);
      if (!operation.isCurrent()) return;
      uploaded = true;
      await updateUserProfile(account.uid, { photoURL: response.profileImageUrl });
      if (!operation.isCurrent()) return;
      Alert.alert(t('success'), t('profile_picture_updated_successfully'));
    } catch (error) {
      if (!operation.isCurrent()) return;
      const failure = error as { code?: string; outcomeUnknown?: boolean };
      const message = uploaded
        ? t('profile_photo_save_incomplete')
        : failure.outcomeUnknown
          ? t('request_outcome_unknown')
          : failure.code === 'UNSUPPORTED_PHOTO_FORMAT'
            ? t('profile_photo_format_unsupported')
            : t('failed_to_upload_profile_picture_please_try');
      Alert.alert(t('error'), message);
    } finally {
      if (operation.isCurrent()) {
        setUploadingFor(null);
        imageOperation.current = null;
      }
    }
  };

  const handlePremiumClick = () => {
    navigation.navigate('Premium');
  };

  const isPremium =
    subscription.status === 'verified' && subscription.subscription?.isPremium === true;
  const newSalesAvailable = areNewSubscriptionsAvailable();
  const isFree =
    subscription.status === 'verified' && subscription.subscription?.isPremium === false;

  const menuItems = [
    {
      icon: 'person-circle-outline',
      label: t('my_avatar'),
      action: () => navigation.navigate('Avatar'),
    },
    {
      icon: 'settings-outline',
      label: t('settings'),
      action: () => navigation.navigate('Settings'),
    },
    {
      icon: 'trophy-outline',
      label: t('achievements'),
      action: () => navigation.navigate('Achievements'),
    },
    {
      icon: 'bar-chart-outline',
      label: t('track_your_progress'),
      action: () => navigation.navigate('Dashboard'),
    },
    {
      icon: 'notifications-outline',
      label: t('notifications'),
      action: () => navigation.navigate('Settings'),
    },
    {
      icon: 'help-circle-outline',
      label: t('help_support'),
      action: () => Linking.openURL('https://berkemd.github.io/wristsuite/lilove/support.html'),
    },
    {
      icon: 'document-text-outline',
      label: t('privacy_policy'),
      action: () => Linking.openURL('https://berkemd.github.io/wristsuite/lilove/privacy.html'),
    },
  ];

  const renderStatsSection = () => {
    if (isLoadingStats && !isRefreshing) {
      return (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <SkeletonBox width={48} height={28} style={{ marginBottom: 6 }} />
            <SkeletonBox width={40} height={14} />
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <SkeletonBox width={48} height={28} style={{ marginBottom: 6 }} />
            <SkeletonBox width={56} height={14} />
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <SkeletonBox width={48} height={28} style={{ marginBottom: 6 }} />
            <SkeletonBox width={36} height={14} />
          </View>
        </View>
      );
    }

    if (statsError || !userStats) {
      return (
        <TouchableOpacity
          style={styles.statsErrorContainer}
          onPress={loadUserStats}
          activeOpacity={0.7}
          accessibilityRole="button"
          testID="button-retry-profile-stats"
        >
          <Ionicons name="refresh" size={20} color={themeColor('#6B7280', 'text')} />
          <Text style={styles.statsErrorText}>{t('tap_to_load_stats')}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{coins.balance ?? '—'}</Text>
          <Text style={styles.statLabel}>{t('coins')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats.streakCount}</Text>
          <Text style={styles.statLabel}>{t('day_streak')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats.totalGoals}</Text>
          <Text style={styles.statLabel}>{t('goals')}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleImagePick}
            disabled={isUploadingImage}
            activeOpacity={0.8}
            data-testid="button-change-avatar"
          >
            {isUploadingImage ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color={themeColor('#8B5CF6', 'text')} size="large" />
              </View>
            ) : profilePhotoUrl ? (
              <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {userProfile?.displayName?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color={themeColor('#FFFFFF', 'text')} />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{userProfile?.displayName || user?.displayName || 'User'}</Text>
          <Text style={styles.email}>{userProfile?.email || user?.email}</Text>

          {isPremium ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={16} color={themeColor('#F59E0B', 'text')} />
              <Text style={styles.premiumText}>
                {subscription.subscription?.subscriptionTier === 'team' ? 'Team' : 'Pro'}
              </Text>
            </View>
          ) : isFree && newSalesAvailable ? (
            <TouchableOpacity
              style={styles.upgradeBadge}
              onPress={handlePremiumClick}
              activeOpacity={0.7}
              data-testid="button-upgrade-premium"
            >
              <Ionicons name="sparkles" size={16} color={themeColor('#8B5CF6', 'text')} />
              <Text style={styles.upgradeText}>{t('upgrade_to_premium')}</Text>
            </TouchableOpacity>
          ) : !isFree ? (
            <TouchableOpacity
              style={styles.upgradeBadge}
              onPress={() => subscription.refresh(true)}
              disabled={subscription.status === 'loading'}
              accessibilityRole="button"
              accessibilityLabel={`${t('subscription_unverified')}. ${t('subscription_check_again')}`}
            >
              <Ionicons name="refresh" size={16} color={themeColor('#8B5CF6', 'text')} />
              <Text style={[styles.upgradeText, { flexShrink: 1 }]}>
                {subscription.status === 'loading'
                  ? t('subscription_checking')
                  : subscription.status === 'error'
                    ? t('subscription_unavailable')
                    : t('subscription_unverified')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {renderStatsSection()}

        <View style={styles.menuContainer}>
          {
            <TouchableOpacity
              style={styles.premiumMenuItem}
              onPress={handlePremiumClick}
              activeOpacity={0.7}
              data-testid="button-subscription-settings"
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: themeColor('#FEF3C7', 'background') },
                  ]}
                >
                  <Ionicons name="star" size={20} color={themeColor('#F59E0B', 'text')} />
                </View>
                <View>
                  <Text style={styles.menuItemText}>
                    {isFree && newSalesAvailable ? t('unlock_premium') : t('subscription')}
                  </Text>
                  <Text style={styles.menuItemSubtext}>
                    {isFree && newSalesAvailable
                      ? t('choose_your_plan')
                      : isPremium
                        ? t('manage_subscription')
                        : t('restore_purchases')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColor('#F59E0B', 'text')} />
            </TouchableOpacity>
          }

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.action}
              activeOpacity={0.7}
              data-testid={`button-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={themeColor('#6B7280', 'text')}
                  />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeColor('#D1D5DB', 'text')} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
          data-testid="button-logout"
        >
          <Ionicons name="log-out-outline" size={20} color={themeColor('#EF4444', 'text')} />
          <Text style={styles.logoutText}>{t('log_out')}</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text
            style={styles.versionText}
          >{`LiLove v${Constants.expoConfig?.version ?? ''} (${Constants.expoConfig?.ios?.buildNumber ?? ''})`}</Text>
          <Text style={styles.copyrightText}>{t('made_with_love_for_your_growth')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8B5CF6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 8,
  },
  statsErrorText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  menuContainer: {
    paddingHorizontal: 24,
  },
  premiumMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 32,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionContainer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 48,
    gap: 4,
  },
  versionText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  copyrightText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
});
