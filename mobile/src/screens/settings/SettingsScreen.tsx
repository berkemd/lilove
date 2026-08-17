import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

export default function SettingsScreen({ navigation }: any) {
  const { userProfile, updateUser, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(userProfile?.settings?.notifications ?? true);
  const [darkMode, setDarkMode] = useState(userProfile?.settings?.theme === 'dark');

  const handleNotificationToggle = async (value: boolean) => {
    setNotifications(value);
    try {
      await updateUser({
        settings: {
          theme: userProfile?.settings?.theme || 'light',
          language: userProfile?.settings?.language || 'en',
          notifications: value,
        },
      });
    } catch (error) {
      setNotifications(!value);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleThemeToggle = async (value: boolean) => {
    setDarkMode(value);
    try {
      await updateUser({
        settings: {
          theme: value ? 'dark' : 'light',
          notifications: userProfile?.settings?.notifications ?? true,
          language: userProfile?.settings?.language || 'en',
        },
      });
    } catch (error) {
      setDarkMode(!value);
      Alert.alert('Error', 'Failed to update theme settings');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Contact Support',
              'To delete your account, please contact support@lilove.org'
            );
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        onPress: async () => {
          await logout();
        },
        style: 'destructive',
      },
    ]);
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open the link');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color="#6B7280" />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
              thumbColor={notifications ? '#8B5CF6' : '#9CA3AF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={22} color="#6B7280" />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={handleThemeToggle}
              trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
              thumbColor={darkMode ? '#8B5CF6' : '#9CA3AF'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Premium')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="star-outline" size={22} color="#6B7280" />
              <Text style={styles.settingText}>Subscription</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {userProfile?.subscriptionTier === 'premium' ? 'Premium' : 'Free'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => openURL('mailto:support@lilove.org')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="mail-outline" size={22} color="#6B7280" />
              <Text style={styles.settingText}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => openURL('https://lilove.org/privacy')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-outline" size={22} color="#6B7280" />
              <Text style={styles.settingText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => openURL('https://lilove.org/terms')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={22} color="#6B7280" />
              <Text style={styles.settingText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          
          <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
              <Text style={styles.dangerText}>Delete Account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>LiLove v1.0.0 (Build 126)</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  settingValue: {
    fontSize: 14,
    color: '#6B7280',
  },
  dangerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dangerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
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
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
