import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { ThemeProvider, useTheme, useThemedStyles } from './src/theme/ThemeProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from './src/store/authStore';
import notificationService from './src/services/notifications';
import { initIAP } from './src/services/iap';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ProfileRecovery } from './src/components/ProfileRecovery';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './src/services/pushNotifications';
import { api } from './src/services/api';
import { tokenManager } from './src/services/tokenManager';
import { COACH_RELEASE_AVAILABLE } from './src/lib/coachAvailability';
import { t } from './src/i18n';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import GoalsScreen from './src/screens/goals/GoalsScreen';
import TasksScreen from './src/screens/tasks/TasksScreen';
import HabitsScreen from './src/screens/habits/HabitsScreen';
import CoachScreen from './src/screens/coach/CoachScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import AchievementsScreen from './src/screens/achievements/AchievementsScreen';
import AvatarScreen from './src/screens/avatar/AvatarScreen';
import CoinsScreen from './src/screens/CoinsScreen';
import GrowthSanctuaryMobile from './src/components/GrowthSanctuaryMobile';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          headerShown: true,
          title: '',
          headerBackTitle: t('nav_back'),
          headerBackTruncatedTitle: t('nav_back'),
          headerBackAccessibilityLabel: t('nav_back'),
        }}
      />
      <Stack.Screen
        name="TaskGoal"
        component={GoalsScreen}
        initialParams={{ createForTask: true }}
      />
      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Coins"
        component={CoinsScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="Avatar"
        component={AvatarScreen}
        options={{
          headerShown: true,
          title: t('my_avatar'),
          headerBackTitle: t('nav_back'),
          headerBackTruncatedTitle: t('nav_back'),
          headerBackAccessibilityLabel: t('nav_back'),
        }}
      />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen
        name="GrowthSanctuary"
        component={GrowthSanctuaryMobile}
        options={{
          presentation: 'card',
        }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { color } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color('#8B5CF6'),
        tabBarInactiveTintColor: color('#9CA3AF'),
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('nav_home'),
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarLabel: t('goals'),
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="flag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachScreen}
        options={{
          tabBarLabel: t('nav_coach'),
          tabBarButton: COACH_RELEASE_AVAILABLE ? undefined : () => null,
          tabBarItemStyle: COACH_RELEASE_AVAILABLE ? undefined : { display: 'none' },
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          tabBarLabel: t('habits'),
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('nav_profile'),
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { isDark, ready, color } = useTheme();
  const styles = useThemedStyles(baseStyles);
  const navigationTheme = isDark ? DarkTheme : DefaultTheme;
  const {
    isAuthenticated,
    isDemo,
    isLoading,
    initializeAuth,
    userProfile,
    profileStatus,
    retryProfile,
    logout,
  } = useAuthStore();

  useEffect(() => {
    const cleanupAuth = initializeAuth();
    initializeServices();
    return cleanupAuth;
  }, []);

  useEffect(() => {
    if (isAuthenticated && userProfile) {
      setupPushNotifications();
    }
  }, [isAuthenticated, userProfile]);

  const setupPushNotifications = async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        console.log('[Push] Push token registered:', token.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('[Push] Failed to setup push notifications:', error);
    }
  };

  const initializeServices = async () => {
    try {
      await initIAP();
      console.log('[App] StoreKit initialized');
    } catch (error) {
      console.error('[App] StoreKit init failed:', error);
    }

    await notificationService.registerForPushNotifications();

    const receivedSubscription = addNotificationReceivedListener((notification) => {
      console.log('[Push] Notification received:', notification);
    });

    const responseSubscription = addNotificationResponseListener((response) => {
      console.log('[Push] Notification tapped:', response);
    });

    notificationService.setupNotificationListeners(
      (notification) => console.log('Notification received:', notification),
      (response) => console.log('Notification response:', response)
    );
  };

  if (isLoading || !ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading LiLove...</Text>
      </View>
    );
  }

  if (isAuthenticated && !isDemo && profileStatus !== 'ready') {
    return (
      <SafeAreaProvider>
        <ProfileRecovery
          pending={profileStatus === 'loading'}
          onRetry={retryProfile}
          onLogout={logout}
        />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer
          theme={{
            ...navigationTheme,
            colors: {
              ...navigationTheme.colors,
              primary: color('#8B5CF6'),
              background: color('#F9FAFB', 'background'),
              card: color('#FFFFFF', 'background'),
              text: color('#111827'),
              border: color('#E5E7EB', 'border'),
            },
          }}
        >
          {isAuthenticated ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
        {/* DEMO ŞERİDİ HER EKRANDA.
            Tek yerde duruyor çünkü her ekrana ayrı ayrı konsaydı, yeni
            yazılan ekran onu unuturdu ve kullanıcı örnek veriye kendi
            verisi sanarak bakardı. Kapatılamaz: kapatılabilir bir
            uyarı, okunmamış bir uyarıdır. */}
        {isAuthenticated && isDemo && (
          <View style={styles.demoBanner} pointerEvents="none">
            <Text style={styles.demoBannerText}>
              {t('sample_data_nothing_is_saved_to_your_account')}
            </Text>
          </View>
        )}
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const baseStyles = StyleSheet.create({
  demoBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(124, 58, 237, 0.94)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  demoBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
// CI/CD test
