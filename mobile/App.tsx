import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from './src/store/authStore';
import notificationService from './src/services/notifications';
import { initIAP } from './src/services/iap';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './src/services/pushNotifications';
import { api } from './src/services/api';
import { tokenManager } from './src/services/tokenManager';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import GoalsScreen from './src/screens/goals/GoalsScreen';
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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#9CA3AF',
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
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Goals" 
        component={GoalsScreen}
        options={{
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="flag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Coach" 
        component={CoachScreen}
        options={{
          tabBarLabel: 'AI Coach',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Avatar" 
        component={AvatarScreen}
        options={{
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const { isAuthenticated, isDemo, isLoading, initializeAuth, userProfile } = useAuthStore();

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading LiLove...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
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
              Demo · sample data, nothing is saved
            </Text>
          </View>
        )}
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
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
