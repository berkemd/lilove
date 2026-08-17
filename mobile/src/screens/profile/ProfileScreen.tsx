import { useEffect, useState } from 'react';
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
import { useAuthStore } from '../../store/authStore';
import storage from '../../services/storage';
import * as ImagePicker from 'expo-image-picker';
import api from '../../lib/api';

interface UserStats {
  streak: number;
  totalGoals: number;
  completedTasks: number;
}

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: '#E5E7EB',
          borderRadius: 8,
        },
        style,
      ]}
    />
  );
}

export default function ProfileScreen({ navigation }: any) {
  const { user, userProfile, logout, updateUser } = useAuthStore();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    streak: 0,
    totalGoals: 0,
    completedTasks: 0,
  });
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    setStatsError(false);
    try {
      const analytics = await api.getAnalytics('30d');
      setUserStats({
        streak: analytics.currentStreak || 0,
        totalGoals: analytics.totalGoals || 0,
        completedTasks: analytics.completedTasks || 0,
      });
    } catch (err) {
      console.error('Failed to load user stats:', err);
      setStatsError(true);
    } finally {
      setIsLoadingStats(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUserStats();
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        onPress: async () => {
          await logout();
          await storage.clear();
        },
        style: 'destructive',
      },
    ]);
  };

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadProfilePicture(result.assets[0].uri);
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    try {
      setIsUploadingImage(true);
      const response = await api.uploadProfilePicture(uri);
      updateUser({ photoURL: response.profileImageUrl });
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePremiumClick = () => {
    navigation.navigate('Premium');
  };

  const isPremium = userProfile?.subscriptionTier === 'premium' || userProfile?.isPremium;

  const menuItems = [
    { icon: 'settings-outline', label: 'Settings', action: () => navigation.navigate('Settings') },
    { icon: 'trophy-outline', label: 'Achievements', action: () => navigation.navigate('Achievements') },
    { icon: 'bar-chart-outline', label: 'Analytics', action: () => navigation.navigate('Dashboard') },
    { icon: 'notifications-outline', label: 'Notifications', action: () => navigation.navigate('Settings') },
    { icon: 'help-circle-outline', label: 'Help & Support', action: () => Linking.openURL('mailto:support@lilove.org') },
    { icon: 'document-text-outline', label: 'Privacy Policy', action: () => Linking.openURL('https://lilove.org/privacy') },
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

    if (statsError) {
      return (
        <TouchableOpacity style={styles.statsErrorContainer} onPress={loadUserStats} activeOpacity={0.7}>
          <Ionicons name="refresh" size={20} color="#6B7280" />
          <Text style={styles.statsErrorText}>Tap to load stats</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userProfile?.coinBalance || 0}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats.streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats.totalGoals}</Text>
          <Text style={styles.statLabel}>Goals</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />
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
                <ActivityIndicator color="#8B5CF6" size="large" />
              </View>
            ) : userProfile?.photoURL ? (
              <Image source={{ uri: userProfile.photoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{userProfile?.displayName?.[0]?.toUpperCase() || '?'}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{userProfile?.displayName || user?.displayName || 'User'}</Text>
          <Text style={styles.email}>{userProfile?.email || user?.email}</Text>

          {isPremium ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.premiumText}>Premium Member</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.upgradeBadge} onPress={handlePremiumClick} activeOpacity={0.7} data-testid="button-upgrade-premium">
              <Ionicons name="sparkles" size={16} color="#8B5CF6" />
              <Text style={styles.upgradeText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderStatsSection()}

        <View style={styles.menuContainer}>
          {!isPremium && (
            <TouchableOpacity style={styles.premiumMenuItem} onPress={handlePremiumClick} activeOpacity={0.7} data-testid="button-unlock-premium">
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                </View>
                <View>
                  <Text style={styles.menuItemText}>Unlock Premium</Text>
                  <Text style={styles.menuItemSubtext}>Get unlimited access</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
            </TouchableOpacity>
          )}

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
                  <Ionicons name={item.icon as any} size={20} color="#6B7280" />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7} data-testid="button-logout">
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>LiLove v1.0.0</Text>
          <Text style={styles.copyrightText}>Made with love for your growth</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
