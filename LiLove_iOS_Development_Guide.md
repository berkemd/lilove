# LiLove iOS App Development Guide
## Complete Guide to Transform Your Web App into a Native iOS App

---

## 📱 Overview

This comprehensive guide will help you transform the LiLove web application into a fully functional iOS native app using Expo and React Native. The guide covers everything from initial setup to App Store deployment.

**Current Status**: LiLove has a React web app and a basic React Native foundation. This guide will help you transition to Expo and create a production-ready iOS app.

---

## 📋 Table of Contents

1. [React Native Setup on Replit](#1-react-native-setup-on-replit)
2. [Development Environment Setup](#2-development-environment-setup)
3. [Code Sharing Strategy](#3-code-sharing-strategy)
4. [iOS-Specific Implementation](#4-ios-specific-implementation)
5. [Apple Developer Account Setup](#5-apple-developer-account-setup)
6. [Expo EAS Build & Deployment](#6-expo-eas-build--deployment)
7. [Specific LiLove Features](#7-specific-lilove-features)
8. [Testing & Deployment Workflow](#8-testing--deployment-workflow)

---

## 1. React Native Setup on Replit

### 1.1 Create New Expo Project in Replit

Since you already have a vanilla React Native project, you'll need to migrate to Expo for easier iOS deployment.

#### Step 1: Create New Expo Template
```bash
# In your Replit workspace, create a new directory for the Expo version
mkdir mobile-expo
cd mobile-expo

# Initialize new Expo project
npx create-expo-app@latest LiLove --template blank-typescript
cd LiLove
```

#### Step 2: Install Essential Dependencies
```bash
# Navigation dependencies
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context

# State management and API
npm install @tanstack/react-query axios

# UI and styling
npm install react-native-svg react-native-vector-icons
npx expo install expo-linear-gradient expo-font

# Storage and device features
npx expo install @react-native-async-storage/async-storage
npx expo install expo-notifications expo-device expo-constants

# Authentication and security
npx expo install expo-crypto expo-secure-store

# Additional UI components
npm install react-native-elements react-native-paper
npx expo install expo-haptics expo-status-bar
```

#### Step 3: Configure app.json
```json
{
  "expo": {
    "name": "LiLove",
    "slug": "lilove-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#8B5CF6"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.lilove",
      "buildNumber": "1",
      "infoPlist": {
        "UIBackgroundModes": ["background-fetch", "remote-notification"],
        "NSFaceIDUsageDescription": "This app uses Face ID for secure authentication"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#8B5CF6"
      },
      "package": "com.yourcompany.lilove"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-notifications",
      [
        "expo-font",
        {
          "fonts": ["./assets/fonts/Inter-Regular.ttf"]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id-will-be-generated"
      }
    }
  }
}
```

### 1.2 Code Sharing Strategy Setup

#### Step 1: Create Shared Directory Structure
```
project-root/
├── web/                  # Your existing web app
├── mobile-expo/         # New Expo app
├── shared/              # Shared code
│   ├── types/
│   ├── utils/
│   ├── api/
│   ├── constants/
│   └── hooks/
└── assets/             # Shared assets
```

#### Step 2: Migrate Shared Schema
```typescript
// shared/types/index.ts
export * from '../../shared/schema';

// shared/api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://your-replit-url.replit.app/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add auth interceptor with secure token storage
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to retrieve auth token from secure storage:', error);
  }
  return config;
});
```

### 1.3 Navigation Setup

#### Step 1: Create Navigation Structure
```typescript
// navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import GoalsScreen from '../screens/GoalsScreen';
import CoachScreen from '../screens/CoachScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import { useAuth } from '../hooks/useAuth';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Goals':
              iconName = focused ? 'flag' : 'flag-outline';
              break;
            case 'Coach':
              iconName = focused ? 'chatbubble' : 'chatbubble-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Coach" component={CoachScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 2. Migrating Existing Mobile App to Expo

### 🚨 CRITICAL: Concrete Migration Strategy

**IMPORTANT**: The existing `mobile/` folder contains a vanilla React Native project with LSP errors and incompatible dependencies. This section provides step-by-step migration to Expo for App Store compliance.

### 2.1 Migration Assessment

#### Current State Analysis:
```bash
# Analyze current mobile/ project
cd mobile/
npm list --depth=0

# Common issues found:
# ❌ react-native 0.73.2 (vanilla RN, not Expo)
# ❌ react-native-push-notification (incompatible with Expo)
# ❌ @react-native-community/netinfo (needs Expo equivalent)
# ❌ No Expo SDK configuration
# ❌ No EAS build support
```

#### Migration Decision Matrix:
| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **In-place Expo Integration** | Preserve existing code | Complex, risky | ❌ Not recommended |
| **New Expo Project + Code Migration** | Clean, reliable | Requires file copying | ✅ **RECOMMENDED** |
| **Expo Bare Workflow** | More control | Loses Expo benefits | ❌ Unnecessary complexity |

### 2.2 Step-by-Step Migration Process

#### Step 1: Create New Expo Project
```bash
# Create new Expo project alongside existing mobile/
npx create-expo-app@latest mobile-expo --template blank-typescript
cd mobile-expo

# Install essential dependencies for LiLove
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install expo-secure-store expo-notifications expo-device expo-constants
npx expo install expo-linear-gradient expo-font expo-haptics expo-status-bar
npm install @tanstack/react-query axios react-native-svg
```

#### Step 2: Configure Expo App for LiLove
```json
{
  "expo": {
    "name": "LiLove",
    "slug": "lilove-app", 
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#8B5CF6"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.lilove",
      "buildNumber": "1",
      "infoPlist": {
        "UIBackgroundModes": ["background-fetch", "remote-notification"],
        "NSFaceIDUsageDescription": "This app uses Face ID for secure authentication",
        "NSUserTrackingUsageDescription": "This app uses tracking to provide personalized coaching experiences while respecting your privacy.",
        "NSLocationWhenInUseUsageDescription": "Location access helps provide location-based goal reminders."
      },
      "entitlements": {
        "com.apple.developer.in-app-payments": ["Allow"]
      }
    },
    "plugins": [
      "expo-notifications",
      "expo-store-kit",
      [
        "expo-font",
        {
          "fonts": ["./assets/fonts/Inter-Regular.ttf"]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id-will-be-generated"
      }
    }
  }
}
```

#### Step 3: Migrate Core Files with Security Fixes

##### 3.1 Migrate Storage Utilities (CRITICAL SECURITY FIX)
```bash
# Copy and convert mobile/src/utils/storage.ts
cp mobile/src/utils/storage.ts mobile-expo/src/utils/storage.ts
```

**CRITICAL**: Replace the insecure AsyncStorage with expo-secure-store:

```typescript
// mobile-expo/src/utils/storage.ts - SECURE VERSION
import * as SecureStore from 'expo-secure-store';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  THEME: 'theme',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  PUSH_TOKEN: 'pushToken',
  LAST_SYNC: 'lastSync',
};

// 🔐 SECURE AUTH TOKEN MANAGEMENT
export const saveAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
    console.log('✅ Auth token saved securely to Keychain');
  } catch (error) {
    console.error('❌ Error saving auth token to secure storage:', error);
    throw error;
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    return token;
  } catch (error) {
    console.error('❌ Error getting auth token from secure storage:', error);
    return null;
  }
};

export const removeAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    console.log('✅ Auth token removed from secure storage');
  } catch (error) {
    console.error('❌ Error removing auth token from secure storage:', error);
  }
};

// User data can use regular AsyncStorage (non-sensitive)
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveUserData = async (userData: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

export const getUserData = async (): Promise<any | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Clear auth-related secure storage
export const clearAuthStorage = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    console.log('✅ Auth storage cleared securely');
  } catch (error) {
    console.error('❌ Error clearing auth storage:', error);
  }
};

// Export storage keys for external use
export { STORAGE_KEYS };
```

##### 3.2 Migrate API Service with Secure Token Handling
```typescript
// mobile-expo/src/services/api.ts - SECURE VERSION
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Network from 'expo-network';

// API Base URL
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://your-deployed-backend.replit.app/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔐 SECURE REQUEST INTERCEPTOR
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to retrieve auth token from secure storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with secure token cleanup
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth data securely on unauthorized
      try {
        await SecureStore.deleteItemAsync('authToken');
        await AsyncStorage.removeItem('userData');
        console.log('✅ Cleared auth data after 401 response');
      } catch (cleanupError) {
        console.error('❌ Error clearing auth data:', cleanupError);
      }
    }
    return Promise.reject(error);
  }
);

// Rest of API methods remain the same...
export { apiClient };
```

##### 3.3 Migrate Screens with Expo-Compatible Navigation
```bash
# Create directory structure
mkdir -p mobile-expo/src/screens
mkdir -p mobile-expo/src/components
mkdir -p mobile-expo/src/hooks

# Copy screen files (will need manual conversion)
cp mobile/src/screens/*.tsx mobile-expo/src/screens/
cp mobile/src/components/*.tsx mobile-expo/src/components/
```

##### 3.4 Update Navigation to Expo Standards
```typescript
// mobile-expo/App.tsx - Updated for Expo
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { getAuthToken } from './src/utils/storage';

import LoginScreen from './src/screens/LoginScreen';
import TabNavigator from './src/components/TabNavigator';

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getAuthToken();
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
      await SplashScreen.hideAsync();
    }
  };

  if (isLoading) {
    return null; // Splash screen is showing
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={TabNavigator} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

### 2.3 Dependency Migration & Fixes

#### Step 1: Remove Incompatible Dependencies
```typescript
// Dependencies to REMOVE from mobile/ (incompatible with Expo):
/*
❌ react-native-push-notification
❌ @react-native-community/push-notification-ios  
❌ @react-native-community/netinfo (use expo-network)
❌ react-native-vector-icons (use @expo/vector-icons)
❌ Any react-native link commands
*/
```

#### Step 2: Add Expo Equivalents
```bash
# Install Expo equivalents
npx expo install expo-notifications        # replaces react-native-push-notification
npx expo install expo-network             # replaces @react-native-community/netinfo
# @expo/vector-icons is included by default
```

#### Step 3: Update Import Statements
```typescript
// OLD (vanilla RN):
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/Ionicons';

// NEW (Expo):
import * as Network from 'expo-network';
import { Ionicons } from '@expo/vector-icons';
```

### 2.4 Migration Validation Checklist

#### Pre-Migration Checklist:
```
Before starting migration:
□ Backup existing mobile/ folder
□ Document current features and dependencies
□ Test existing app functionality
□ Note any custom native modules
□ Identify hardcoded paths or configurations
```

#### During Migration Checklist:
```
For each migrated file:
□ Replace AsyncStorage with SecureStore for sensitive data
□ Update imports to Expo equivalents
□ Test component rendering
□ Verify navigation flow
□ Check API connectivity
□ Validate secure storage functionality
```

#### Post-Migration Validation:
```
Essential validation steps:
□ App launches without crashes
□ Authentication flow works with secure storage
□ All screens navigate correctly
□ API calls succeed with secure token handling
□ Push notifications work (Expo implementation)
□ No console errors or warnings
□ Build succeeds with Expo CLI
□ Preview build installs on device
```

### 2.5 Testing Migration Success

#### Step 1: Development Build Test
```bash
cd mobile-expo
npx expo start

# Test checklist:
# ✅ App loads in Expo Go
# ✅ Authentication works
# ✅ Navigation functions
# ✅ API calls succeed
# ✅ Secure storage saves/retrieves tokens
```

#### Step 2: Production Build Test
```bash
# Create production build to verify Expo compatibility
eas build --platform ios --profile preview
```

#### Step 3: Feature Parity Verification
```
Verify migrated features:
□ User login/logout
□ Goal creation/editing
□ AI coach interactions  
□ Profile management
□ Push notifications
□ Offline functionality
□ Theme switching
```

### 2.6 Migration Troubleshooting

#### Common Migration Issues:

**Issue 1: "Package not compatible with Expo"**
```bash
# Solution: Find Expo equivalent
npx expo install expo-[equivalent-package]
```

**Issue 2: "Metro bundler cannot resolve module"**
```bash
# Solution: Clear cache and reinstall
npx expo start --clear
npm install
```

**Issue 3: "Build fails with native code dependencies"**
```bash
# Solution: Remove native dependencies, use Expo APIs
npm uninstall [problematic-package]
npx expo install [expo-equivalent]
```

**Issue 4: "Secure storage not working"**
```typescript
// Solution: Check device compatibility
import * as SecureStore from 'expo-secure-store';

const isAvailable = await SecureStore.isAvailableAsync();
if (!isAvailable) {
  console.warn('Secure storage not available, falling back to AsyncStorage');
  // Implement fallback
}
```

### 2.7 Migration Success Criteria

#### ✅ Migration Complete When:
- [ ] All screens render correctly in Expo Go
- [ ] Authentication uses secure storage (Keychain)
- [ ] No AsyncStorage for sensitive data
- [ ] All API calls include secure auth headers  
- [ ] Push notifications work with Expo Notifications
- [ ] App builds successfully with EAS
- [ ] No deprecated React Native dependencies
- [ ] Production build installs and runs on device
- [ ] All LiLove features functional
- [ ] Ready for App Store submission

---

## 3. Development Environment Setup

### 2.1 Replit Configuration

#### Step 1: Configure Replit for Expo Development
```bash
# Create .replit file
cat > .replit << EOF
language = "nodejs"
modules = ["nodejs-20"]

[deployment]
run = ["npm", "start"]

[env]
PATH = "/home/runner/\$REPL_SLUG/.config/npm/node_global/bin:/home/runner/\$REPL_SLUG/node_modules/.bin:\$PATH"
npm_config_prefix = "/home/runner/\$REPL_SLUG/.config/npm/node_global"

[nix]
channel = "stable-22_11"

[gitHubImport]
requiredFiles = [".replit", "replit.nix"]

[[ports]]
localPort = 19000
externalPort = 80

[[ports]]
localPort = 19001
externalPort = 8080

[[ports]]
localPort = 19002
externalPort = 3000
EOF
```

#### Step 2: Create Development Scripts
```json
// package.json scripts section
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "tunnel": "expo start --tunnel",
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android",
    "submit:ios": "eas submit --platform ios",
    "submit:android": "eas submit --platform android"
  }
}
```

### 2.2 Expo Go Setup

#### Step 1: Install Expo Go on Your iPhone
1. Download Expo Go from the App Store
2. Create an Expo account if you don't have one
3. Sign in to the same account in your development environment

#### Step 2: Start Development Server
```bash
# In your mobile-expo/LiLove directory
npm start

# Choose development mode
# - Use tunnel for external access from different networks
# - Use LAN for same network access
# - Use localhost for Replit internal testing
```

#### Step 3: Connect Your Device
1. Open Expo Go on your iPhone
2. Scan the QR code displayed in your terminal or Replit console
3. Your app will load on your device for real-time testing

### 2.3 Development Workflow Optimization

#### Hot Reload Configuration
```typescript
// App.tsx development configuration
import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';
import App from './src/App';

// Enable native screens for better performance
enableScreens();

// Enable hot reloading in development
if (__DEV__) {
  require('./ReactotronConfig');
}

registerRootComponent(App);
```

#### Debug Configuration
```typescript
// debug/ReactotronConfig.ts (optional but recommended)
import Reactotron from 'reactotron-react-native';
import { NativeModules } from 'react-native';

const scriptURL = NativeModules.SourceCode.scriptURL;
const scriptHostname = scriptURL.split('://')[1].split(':')[0];

const reactotron = Reactotron
  .configure({ host: scriptHostname })
  .useReactNative()
  .connect();

export default reactotron;
```

---

## 3. Code Sharing Strategy

### 3.1 Shared Business Logic

#### API Layer Abstraction
```typescript
// shared/api/goals.ts
import { apiClient } from './client';
import { Goal, CreateGoalInput } from '../types';

export class GoalsAPI {
  static async getGoals(): Promise<Goal[]> {
    const response = await apiClient.get('/goals');
    return response.data;
  }

  static async createGoal(goal: CreateGoalInput): Promise<Goal> {
    const response = await apiClient.post('/goals', goal);
    return response.data;
  }

  static async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    const response = await apiClient.patch(`/goals/${id}`, updates);
    return response.data;
  }

  static async deleteGoal(id: string): Promise<void> {
    await apiClient.delete(`/goals/${id}`);
  }
}
```

#### Shared Hooks
```typescript
// shared/hooks/useGoals.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GoalsAPI } from '../api/goals';
import { Goal, CreateGoalInput } from '../types';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: GoalsAPI.getGoals,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: GoalsAPI.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Goal> }) =>
      GoalsAPI.updateGoal(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
```

### 3.2 Component Adaptation Strategy

#### Create Platform-Agnostic Base Components
```typescript
// shared/components/base/Button.ts
export interface BaseButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

// mobile-expo/src/components/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BaseButtonProps } from '../../../shared/components/base/Button';

export const Button: React.FC<BaseButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, styles[`${variant}Text`]]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#8B5CF6',
  },
  secondary: {
    backgroundColor: '#E5E7EB',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: '600',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#374151',
  },
  outlineText: {
    color: '#8B5CF6',
  },
});
```

### 3.3 Styling Approach

#### Create Design System
```typescript
// shared/theme/colors.ts
export const colors = {
  primary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  secondary: {
    50: '#FDF2F8',
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#EC4899',
    600: '#DB2777',
    700: '#BE185D',
    800: '#9D174D',
    900: '#831843',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

// shared/theme/typography.ts
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// mobile-expo/src/styles/theme.ts
import { colors, typography } from '../../../shared/theme';

export const theme = {
  colors,
  typography,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
  },
};
```

### 3.4 State Management with React Query

#### Query Client Configuration
```typescript
// shared/query/client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// mobile-expo/src/App.tsx
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../../shared/query/client';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <AppNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

---

## 4. iOS-Specific Implementation

### 4.1 iOS Native Features Integration

#### Push Notifications Setup
```typescript
// services/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Send notification to backend
export async function sendTokenToBackend(token: string) {
  try {
    await apiClient.post('/notifications/register', { token });
  } catch (error) {
    console.error('Failed to send token to backend:', error);
  }
}
```

#### Face ID / Touch ID Authentication
```bash
npx expo install expo-local-authentication
```

```typescript
// services/biometric.ts
import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return false;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access LiLove',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}
```

### 4.2 iOS Design Guidelines Compliance

#### iOS-Specific UI Components
```typescript
// components/ios/ActionSheet.tsx
import React from 'react';
import { ActionSheetIOS, Platform } from 'react-native';

interface ActionSheetProps {
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
  onPress: (index: number) => void;
}

export function showActionSheet({
  options,
  cancelButtonIndex,
  destructiveButtonIndex,
  onPress,
}: ActionSheetProps) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      },
      onPress
    );
  }
}
```

#### iOS Navigation Patterns
```typescript
// navigation/IOSNavigationConfig.ts
import { Platform } from 'react-native';

export const iosNavigationConfig = {
  headerStyle: {
    backgroundColor: '#F8F9FA',
    ...(Platform.OS === 'ios' && {
      shadowColor: 'transparent',
    }),
  },
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 17,
  },
  headerTintColor: '#8B5CF6',
  cardStyleInterpolator: Platform.OS === 'ios' 
    ? ({ current, layouts }) => ({
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
              }),
            },
          ],
        },
      })
    : undefined,
};
```

### 4.3 Device-Specific Optimizations

#### Safe Area Handling
```typescript
// components/SafeAreaWrapper.tsx
import React from 'react';
import { SafeAreaView, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  style,
  edges = ['top', 'bottom'],
}) => {
  const insets = useSafeAreaInsets();
  
  const paddingStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <SafeAreaView style={[paddingStyle, style]}>
      {children}
    </SafeAreaView>
  );
};
```

#### Haptic Feedback
```bash
npx expo install expo-haptics
```

```typescript
// utils/haptics.ts
import * as Haptics from 'expo-haptics';

export const hapticFeedback = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};
```

---

## 5. Apple Developer Account Setup

### 5.1 Apple Developer Program Registration

#### Step 1: Create Apple ID
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Create a new Apple ID or use existing one
3. Enable two-factor authentication (required)
4. Verify your email and phone number

#### Step 2: Enroll in Apple Developer Program
1. Visit [developer.apple.com/programs](https://developer.apple.com/programs/)
2. Click "Enroll" and sign in with your Apple ID
3. Choose account type:
   - **Individual**: $99/year, for personal apps
   - **Organization**: $99/year, requires business verification
4. Complete enrollment process (may take 24-48 hours for verification)
5. Pay the annual fee ($99 USD)

#### Step 3: Access Developer Portal
1. Once approved, access [developer.apple.com/account](https://developer.apple.com/account)
2. Accept developer agreement
3. Complete tax and banking information (if planning to sell apps)

### 5.2 App Identifier and Certificates

#### Step 1: Create App Identifier
1. In Developer Portal, go to "Certificates, Identifiers & Profiles"
2. Click "Identifiers" → "+"
3. Select "App IDs" → "App"
4. Configure App ID:
   ```
   Description: LiLove - Personal Growth Coach
   Bundle ID: com.yourcompany.lilove
   ```
5. Enable capabilities:
   - [x] Push Notifications
   - [x] Background Modes
   - [x] App Groups (if using shared data)
   - [x] Associated Domains (if using universal links)

#### Step 2: Create Certificates
1. **Development Certificate**:
   - Go to "Certificates" → "+"
   - Select "iOS App Development"
   - Generate Certificate Signing Request (CSR) on your Mac:
     ```bash
     # Open Keychain Access → Certificate Assistant → Request Certificate
     # Enter your email and name, save to disk
     ```
   - Upload CSR and download certificate
   - Double-click to install in Keychain

2. **Distribution Certificate**:
   - Go to "Certificates" → "+"
   - Select "iOS Distribution"
   - Follow same CSR process
   - Install certificate

### 5.3 Provisioning Profiles

#### Step 1: Create Development Provisioning Profile
1. Go to "Profiles" → "+"
2. Select "iOS App Development"
3. Choose your App ID (com.yourcompany.lilove)
4. Select development certificate
5. Select development devices
6. Name profile: "LiLove Development"
7. Download and install

#### Step 2: Create Distribution Provisioning Profile
1. Go to "Profiles" → "+"
2. Select "App Store"
3. Choose your App ID
4. Select distribution certificate
5. Name profile: "LiLove Distribution"
6. Download and install

### 5.4 App Store Connect Setup

#### Step 1: Access App Store Connect
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account
3. Accept agreements if prompted

#### Step 2: Create App Record
1. Click "My Apps" → "+"
2. Fill in app information:
   ```
   Name: LiLove
   Primary Language: English
   Bundle ID: com.yourcompany.lilove
   SKU: lilove-app-2024
   ```
3. Configure app details:
   - Category: Health & Fitness / Lifestyle
   - Content Rights: Your content
   - Age Rating: Complete questionnaire
   - Privacy Policy URL: Required

#### Step 3: Configure App Information
1. **App Information**:
   - Privacy Policy URL
   - Support URL
   - Marketing URL (optional)
   - App Category and Subcategory

2. **Pricing and Availability**:
   - Price: Free (or set pricing)
   - Availability: All countries or specific regions
   - App Store Distribution: Available

---

## 6. iOS App Store Compliance & Monetization

### 🚨 CRITICAL: Apple's 3.1.1 Guideline Compliance

**WARNING**: Failure to comply with Apple's App Store Guidelines section 3.1.1 will result in immediate app rejection. LiLove's subscription-based monetization requires specific iOS implementation.

### 6.1 Apple's 3.1.1 Guidelines Overview

#### What Apple's 3.1.1 Requires:
- **Digital Content/Services**: Must use Apple's In-App Purchase (IAP) system
- **Physical Goods**: Can use external payment processors
- **Reader Apps**: Special exception for content consumed outside the app

#### LiLove Classification Analysis:
LiLove provides AI coaching, goal tracking, and premium analytics features - these are **digital services** that must use IAP on iOS.

**❌ FORBIDDEN on iOS App Store:**
- Stripe integration for premium subscriptions
- External payment links
- Mentioning external pricing
- PayGate.to or any third-party payment processor

**✅ REQUIRED for iOS App Store:**
- Apple In-App Purchases for premium features
- StoreKit integration
- App Store subscription management

### 6.2 iOS Monetization Strategy Implementation

#### Step 1: Install IAP Dependencies
```bash
# Install expo-store-kit for In-App Purchases
npx expo install expo-store-kit

# Install RevenueCat for subscription management (recommended)
npm install react-native-purchases

# Alternative: Use expo-store-kit directly
npx expo install expo-store-kit
```

#### Step 2: Configure App Store Connect for IAP

##### Create In-App Purchase Products:
1. **Go to App Store Connect → My Apps → [Your App] → Features → In-App Purchases**
2. **Create Subscription Groups:**
   ```
   Subscription Group: LiLove Premium
   Reference Name: lilove_premium_group
   ```

3. **Create Auto-Renewable Subscriptions:**
   ```
   Monthly Premium:
   - Product ID: com.yourcompany.lilove.premium.monthly
   - Reference Name: Premium Monthly
   - Price: $9.99/month
   - Subscription Group: lilove_premium_group

   Yearly Premium:
   - Product ID: com.yourcompany.lilove.premium.yearly
   - Reference Name: Premium Yearly
   - Price: $99.99/year
   - Subscription Group: lilove_premium_group
   ```

#### Step 3: Update app.json for IAP Entitlements
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.lilove",
      "infoPlist": {
        "UIBackgroundModes": ["background-fetch", "remote-notification"],
        "NSFaceIDUsageDescription": "This app uses Face ID for secure authentication"
      },
      "entitlements": {
        "com.apple.developer.in-app-payments": ["Allow"]
      }
    },
    "plugins": [
      "expo-store-kit"
    ]
  }
}
```

### 6.3 iOS-Specific Subscription Implementation

#### Step 1: Subscription Service with StoreKit
```typescript
// services/subscriptions.ios.ts
import { 
  getProductsAsync, 
  purchaseItemAsync, 
  finishTransactionAsync,
  getReceiptAsync,
  IAPResponseCode,
  InAppPurchase
} from 'expo-store-kit';
import * as SecureStore from 'expo-secure-store';

// Product IDs that match App Store Connect
const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'com.yourcompany.lilove.premium.monthly',
  PREMIUM_YEARLY: 'com.yourcompany.lilove.premium.yearly',
};

export class iOSSubscriptionService {
  private static products: any[] = [];

  // Initialize and load products from App Store
  static async initialize() {
    try {
      const response = await getProductsAsync(Object.values(PRODUCT_IDS));
      if (response.responseCode === IAPResponseCode.OK) {
        this.products = response.results || [];
        console.log('✅ iOS IAP Products loaded:', this.products.length);
      } else {
        console.error('❌ Failed to load iOS IAP products:', response.errorCode);
        throw new Error('Failed to initialize App Store products');
      }
    } catch (error) {
      console.error('❌ iOS IAP initialization error:', error);
      throw error;
    }
  }

  // Get available subscription products
  static getAvailableProducts() {
    return this.products.map(product => ({
      id: product.productIdentifier,
      title: product.localizedTitle,
      description: product.localizedDescription,
      price: product.price,
      priceString: product.priceString,
      currencyCode: product.currencyCode,
    }));
  }

  // Purchase subscription
  static async purchaseSubscription(productId: string) {
    try {
      console.log('🛒 Starting iOS IAP purchase:', productId);
      
      const response = await purchaseItemAsync(productId);
      
      if (response.responseCode === IAPResponseCode.OK && response.results) {
        const purchase = response.results[0];
        
        // Verify purchase with your backend
        const verified = await this.verifyPurchaseWithBackend(purchase);
        
        if (verified) {
          // Finish the transaction
          await finishTransactionAsync(purchase.transactionIdentifier, true);
          
          // Store subscription status securely
          await SecureStore.setItemAsync('ios_subscription_active', 'true');
          await SecureStore.setItemAsync('ios_subscription_product', productId);
          
          console.log('✅ iOS subscription purchase successful');
          return { success: true, purchase };
        } else {
          // Finish transaction but don't grant access
          await finishTransactionAsync(purchase.transactionIdentifier, false);
          throw new Error('Purchase verification failed');
        }
      } else {
        console.log('❌ iOS IAP purchase failed:', response.errorCode);
        return { success: false, error: response.errorCode };
      }
    } catch (error) {
      console.error('❌ iOS subscription purchase error:', error);
      throw error;
    }
  }

  // Verify purchase with backend
  private static async verifyPurchaseWithBackend(purchase: InAppPurchase) {
    try {
      const receipt = await getReceiptAsync();
      
      const response = await fetch('/api/ios/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await SecureStore.getItemAsync('authToken')}`,
        },
        body: JSON.stringify({
          receiptData: receipt,
          productId: purchase.productIdentifier,
          transactionId: purchase.transactionIdentifier,
        }),
      });

      const result = await response.json();
      return result.valid === true;
    } catch (error) {
      console.error('Purchase verification error:', error);
      return false;
    }
  }

  // Check current subscription status
  static async getSubscriptionStatus() {
    try {
      const isActive = await SecureStore.getItemAsync('ios_subscription_active');
      const productId = await SecureStore.getItemAsync('ios_subscription_product');
      
      return {
        isActive: isActive === 'true',
        productId: productId || null,
      };
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { isActive: false, productId: null };
    }
  }

  // Restore purchases
  static async restorePurchases() {
    try {
      console.log('🔄 Restoring iOS purchases...');
      
      // This will trigger the restoration flow
      // Restored purchases will come through the purchase listener
      // Implementation depends on expo-store-kit updates
      
      console.log('✅ iOS purchase restoration completed');
    } catch (error) {
      console.error('❌ iOS purchase restoration error:', error);
      throw error;
    }
  }
}
```

#### Step 2: iOS-Specific Paywall Component
```typescript
// components/ios/IOSPaywall.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { iOSSubscriptionService } from '../../services/subscriptions.ios';

interface IOSPaywallProps {
  onSubscribed: () => void;
  onClose: () => void;
}

export const IOSPaywall: React.FC<IOSPaywallProps> = ({ onSubscribed, onClose }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      await iOSSubscriptionService.initialize();
      const availableProducts = iOSSubscriptionService.getAvailableProducts();
      setProducts(availableProducts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load subscription options');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'iOS subscriptions only available on iOS devices');
      return;
    }

    setPurchasing(productId);

    try {
      const result = await iOSSubscriptionService.purchaseSubscription(productId);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          'Your subscription is now active. Enjoy premium features!',
          [{ text: 'OK', onPress: onSubscribed }]
        );
      } else {
        Alert.alert('Purchase Failed', 'Please try again later.');
      }
    } catch (error: any) {
      if (error.message.includes('cancelled')) {
        // User cancelled, no alert needed
      } else {
        Alert.alert('Error', 'Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    try {
      await iOSSubscriptionService.restorePurchases();
      Alert.alert('Restore Complete', 'Your purchases have been restored.');
    } catch (error) {
      Alert.alert('Restore Failed', 'No previous purchases found.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading subscription options...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.title}>Unlock Premium Features</Text>
        <Text style={styles.subtitle}>
          Get unlimited goals, advanced AI coaching, and detailed analytics
        </Text>
      </LinearGradient>

      <View style={styles.featuresContainer}>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.featureText}>Unlimited Goals & Tasks</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.featureText}>Advanced AI Coaching</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.featureText}>Detailed Analytics</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.featureText}>Priority Support</Text>
        </View>
      </View>

      <View style={styles.productsContainer}>
        {products.map(product => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => handlePurchase(product.id)}
            disabled={purchasing !== null}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productTitle}>{product.title}</Text>
              <Text style={styles.productDescription}>{product.description}</Text>
            </View>
            
            <View style={styles.productPrice}>
              <Text style={styles.priceText}>{product.priceString}</Text>
              {product.id.includes('yearly') && (
                <Text style={styles.savingsText}>Save 17%</Text>
              )}
            </View>

            {purchasing === product.id ? (
              <ActivityIndicator color="#8B5CF6" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
        
        <Text style={styles.disclaimerText}>
          Subscriptions will be charged to your iTunes account. 
          Auto-renewal can be turned off in your iTunes Account Settings.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  featuresContainer: {
    padding: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  productsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  productPrice: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  savingsText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});
```

### 6.4 Backend iOS Purchase Verification

#### Step 1: Add iOS Purchase Verification Endpoint
```typescript
// server/ios-subscriptions.ts
import { Request, Response } from 'express';
import crypto from 'crypto';

interface AppleReceiptData {
  receiptData: string;
  productId: string;
  transactionId: string;
}

// Apple's receipt verification endpoints
const APPLE_RECEIPT_VERIFICATION_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_RECEIPT_VERIFICATION_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';

export async function verifyIOSPurchase(req: Request, res: Response) {
  try {
    const { receiptData, productId, transactionId } = req.body as AppleReceiptData;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify receipt with Apple
    const verificationResult = await verifyReceiptWithApple(receiptData);

    if (!verificationResult.valid) {
      return res.status(400).json({ 
        error: 'Invalid receipt',
        valid: false 
      });
    }

    // Check if transaction matches
    const purchaseInfo = verificationResult.receipt.in_app.find(
      (purchase: any) => purchase.transaction_id === transactionId
    );

    if (!purchaseInfo || purchaseInfo.product_id !== productId) {
      return res.status(400).json({ 
        error: 'Transaction not found',
        valid: false 
      });
    }

    // Update user subscription in database
    await db.update(users)
      .set({
        subscriptionStatus: 'active',
        subscriptionPlatform: 'ios_appstore',
        subscriptionProductId: productId,
        subscriptionTransactionId: transactionId,
        subscriptionExpiresAt: new Date(parseInt(purchaseInfo.expires_date_ms)),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log(`✅ iOS subscription activated for user ${userId}: ${productId}`);

    res.json({ 
      valid: true,
      subscription: {
        active: true,
        productId: productId,
        expiresAt: new Date(parseInt(purchaseInfo.expires_date_ms)),
      }
    });

  } catch (error) {
    console.error('iOS purchase verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      valid: false 
    });
  }
}

async function verifyReceiptWithApple(receiptData: string) {
  try {
    // Try production first, fallback to sandbox
    let response = await fetch(APPLE_RECEIPT_VERIFICATION_PRODUCTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receiptData,
        'password': process.env.APPLE_SHARED_SECRET, // Required for auto-renewable subscriptions
      }),
    });

    const result = await response.json();

    // If production returns sandbox receipt error, try sandbox
    if (result.status === 21007) {
      response = await fetch(APPLE_RECEIPT_VERIFICATION_SANDBOX, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'receipt-data': receiptData,
          'password': process.env.APPLE_SHARED_SECRET,
        }),
      });

      const sandboxResult = await response.json();
      return {
        valid: sandboxResult.status === 0,
        receipt: sandboxResult.receipt,
        environment: 'sandbox',
      };
    }

    return {
      valid: result.status === 0,
      receipt: result.receipt,
      environment: 'production',
    };

  } catch (error) {
    console.error('Apple receipt verification error:', error);
    return { valid: false, receipt: null };
  }
}

// Add route to your Express router
// router.post('/ios/verify-purchase', authenticateToken, verifyIOSPurchase);
```

### 6.5 Feature Gate Implementation for iOS

#### iOS-Specific Feature Access Control
```typescript
// hooks/useIOSSubscription.ts
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { iOSSubscriptionService } from '../services/subscriptions.ios';
import * as SecureStore from 'expo-secure-store';

export function useIOSSubscription() {
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isActive: false,
    productId: null,
    loading: true,
  });

  useEffect(() => {
    if (Platform.OS === 'ios') {
      checkSubscriptionStatus();
    } else {
      // On non-iOS platforms, use web subscription logic
      setSubscriptionStatus({ isActive: false, productId: null, loading: false });
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const status = await iOSSubscriptionService.getSubscriptionStatus();
      setSubscriptionStatus({
        ...status,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking iOS subscription:', error);
      setSubscriptionStatus({ isActive: false, productId: null, loading: false });
    }
  };

  const refreshSubscription = () => {
    if (Platform.OS === 'ios') {
      checkSubscriptionStatus();
    }
  };

  return {
    ...subscriptionStatus,
    refreshSubscription,
    isIOS: Platform.OS === 'ios',
  };
}
```

---

## 7. Production Operations & Compliance

### 🚨 CRITICAL: Complete Backend & Privacy Implementation

**WARNING**: Missing these operational components will cause App Store rejection. All production iOS apps require complete push notification infrastructure, privacy compliance, and data collection disclosures.

### 7.1 Push Notification Backend Integration

#### Step 1: Expo Push API Server Integration
```typescript
// server/push-notifications.ts
import { Expo, ExpoPushMessage, ExpoPushToken } from 'expo-server-sdk';
import { db } from './storage';
import { users, pushTokens, notifications } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Initialize Expo SDK
const expo = new Expo();

interface PushNotificationData {
  userId: string;
  title: string;
  body: string;
  data?: any;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
  badge?: number;
}

export class ExpoPushNotificationService {
  
  // Register push token for user
  static async registerPushToken(userId: string, expoPushToken: string) {
    try {
      // Validate the push token
      if (!Expo.isExpoPushToken(expoPushToken)) {
        throw new Error('Invalid Expo push token format');
      }

      // Store token in database
      await db.insert(pushTokens)
        .values({
          userId,
          token: expoPushToken,
          platform: 'ios',
          isActive: true,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [pushTokens.userId, pushTokens.token],
          set: {
            isActive: true,
            updatedAt: new Date(),
          }
        });

      console.log(`✅ Push token registered for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to register push token:', error);
      throw error;
    }
  }

  // Send push notification to specific user
  static async sendToUser(data: PushNotificationData) {
    try {
      // Get user's active push tokens
      const userTokens = await db.select()
        .from(pushTokens)
        .where(and(
          eq(pushTokens.userId, data.userId),
          eq(pushTokens.isActive, true)
        ));

      if (userTokens.length === 0) {
        console.log(`No active push tokens for user ${data.userId}`);
        return { success: false, reason: 'No active tokens' };
      }

      // Prepare push messages
      const messages: ExpoPushMessage[] = userTokens.map(tokenRecord => ({
        to: tokenRecord.token,
        title: data.title,
        body: data.body,
        data: data.data || {},
        priority: data.priority || 'high',
        sound: data.sound === null ? null : 'default',
        badge: data.badge,
      }));

      // Send notifications in chunks
      const chunks = expo.chunkPushNotifications(messages);
      const results = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          results.push(...ticketChunk);
        } catch (error) {
          console.error('❌ Error sending push notification chunk:', error);
        }
      }

      // Store notification record
      await db.insert(notifications)
        .values({
          userId: data.userId,
          type: 'push',
          title: data.title,
          message: data.body,
          data: JSON.stringify(data.data || {}),
          status: 'sent',
          createdAt: new Date(),
        });

      console.log(`✅ Push notification sent to user ${data.userId}`);
      return { success: true, results };

    } catch (error) {
      console.error('❌ Failed to send push notification:', error);
      throw error;
    }
  }

  // Send push notification to multiple users
  static async sendToUsers(userIds: string[], notificationData: Omit<PushNotificationData, 'userId'>) {
    const results = await Promise.allSettled(
      userIds.map(userId => 
        this.sendToUser({ ...notificationData, userId })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Bulk push notifications: ${successful} sent, ${failed} failed`);
    return { successful, failed, results };
  }

  // LiLove-specific notification types
  static async sendGoalReminder(userId: string, goalTitle: string) {
    return this.sendToUser({
      userId,
      title: '🎯 Goal Reminder',
      body: `Don't forget to work on "${goalTitle}" today!`,
      data: { type: 'goal_reminder', goalTitle },
      priority: 'normal',
    });
  }

  static async sendAchievementUnlocked(userId: string, achievementName: string) {
    return this.sendToUser({
      userId,
      title: '🏆 Achievement Unlocked!',
      body: `Congratulations! You've earned "${achievementName}"`,
      data: { type: 'achievement', achievementName },
      priority: 'high',
      badge: 1,
    });
  }

  static async sendCoachingInsight(userId: string, insight: string) {
    return this.sendToUser({
      userId,
      title: '💡 Daily Insight',
      body: insight,
      data: { type: 'coaching_insight' },
      priority: 'normal',
    });
  }

  static async sendTeamUpdate(userIds: string[], teamName: string, update: string) {
    return this.sendToUsers(userIds, {
      title: `👥 ${teamName}`,
      body: update,
      data: { type: 'team_update', teamName },
      priority: 'normal',
    });
  }

  // Handle push notification receipts
  static async handlePushReceipts() {
    try {
      // This would typically be called periodically to check notification delivery status
      // Implementation depends on your notification tracking requirements
      console.log('📥 Processing push notification receipts...');
      
      // Example: Get failed tokens and mark as inactive
      // Implementation details depend on your database schema
      
    } catch (error) {
      console.error('❌ Error handling push receipts:', error);
    }
  }
}

// Express routes for push notifications
export function addPushNotificationRoutes(router: any) {
  
  // Register push token
  router.post('/notifications/register-token', async (req: any, res: any) => {
    try {
      const { expoPushToken } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!expoPushToken) {
        return res.status(400).json({ error: 'Push token required' });
      }

      await ExpoPushNotificationService.registerPushToken(userId, expoPushToken);
      res.json({ success: true });

    } catch (error) {
      console.error('Push token registration error:', error);
      res.status(500).json({ error: 'Failed to register push token' });
    }
  });

  // Send test notification (development only)
  router.post('/notifications/test', async (req: any, res: any) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test endpoint not available in production' });
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await ExpoPushNotificationService.sendToUser({
        userId,
        title: '🧪 Test Notification',
        body: 'This is a test notification from LiLove!',
        data: { type: 'test' },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });
}
```

#### Step 2: Frontend Push Notification Setup
```typescript
// services/notifications.expo.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class ExpoNotificationService {
  
  // Register for push notifications and send token to backend
  static async registerForPushNotifications() {
    try {
      let token;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('❌ Failed to get push notification permissions');
          return null;
        }
        
        // Get Expo push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.error('❌ No Expo project ID found');
          return null;
        }

        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('✅ Got Expo push token:', token);

        // Send token to backend
        await this.sendTokenToBackend(token);
        
      } else {
        console.log('❌ Must use physical device for Push Notifications');
      }

      return token;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  // Send token to backend
  private static async sendTokenToBackend(token: string) {
    try {
      await apiClient.post('/notifications/register-token', {
        expoPushToken: token,
      });
      console.log('✅ Push token sent to backend');
    } catch (error) {
      console.error('❌ Failed to send push token to backend:', error);
    }
  }

  // Set up notification listeners
  static setupNotificationListeners() {
    // Handle notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      
      // Handle LiLove-specific notification types
      const data = notification.request.content.data;
      
      switch (data?.type) {
        case 'goal_reminder':
          // Handle goal reminder notification
          break;
        case 'achievement':
          // Handle achievement notification
          break;
        case 'coaching_insight':
          // Handle coaching insight notification
          break;
        case 'team_update':
          // Handle team update notification
          break;
      }
    });

    // Handle notification taps
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      
      // Navigate to appropriate screen based on notification type
      switch (data?.type) {
        case 'goal_reminder':
          // Navigate to goals screen
          break;
        case 'achievement':
          // Navigate to achievements screen
          break;
        case 'coaching_insight':
          // Navigate to coach screen
          break;
        case 'team_update':
          // Navigate to team screen
          break;
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  // Send test notification (development only)
  static async sendTestNotification() {
    if (__DEV__) {
      try {
        await apiClient.post('/notifications/test');
        console.log('✅ Test notification sent');
      } catch (error) {
        console.error('❌ Failed to send test notification:', error);
      }
    }
  }
}
```

### 7.2 App Privacy & App Tracking Transparency (ATT)

#### Step 1: Privacy Policy Implementation
```typescript
// components/privacy/PrivacyCompliance.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Alert, Linking } from 'react-native';
import * as Tracking from 'expo-tracking-transparency';
import { Button } from '../ui/Button';

interface PrivacyComplianceProps {
  onPrivacyAccepted: () => void;
}

export const PrivacyCompliance: React.FC<PrivacyComplianceProps> = ({ onPrivacyAccepted }) => {
  const [trackingStatus, setTrackingStatus] = useState<string>('unknown');

  useEffect(() => {
    checkTrackingPermissions();
  }, []);

  const checkTrackingPermissions = async () => {
    try {
      const { status } = await Tracking.getTrackingPermissionsAsync();
      setTrackingStatus(status);
    } catch (error) {
      console.error('Error checking tracking permissions:', error);
    }
  };

  const requestTrackingPermissions = async () => {
    try {
      const { status } = await Tracking.requestTrackingPermissionsAsync();
      setTrackingStatus(status);
      
      if (status === 'granted') {
        console.log('✅ Tracking permissions granted');
        // Enable personalized analytics
      } else {
        console.log('❌ Tracking permissions denied');
        // Continue with limited analytics
      }
      
      onPrivacyAccepted();
    } catch (error) {
      console.error('Error requesting tracking permissions:', error);
      onPrivacyAccepted(); // Continue anyway
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://lilove.app/privacy-policy');
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Privacy & Data Usage
      </Text>
      
      <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 20 }}>
        LiLove uses data to provide personalized coaching experiences. Here's what we collect and why:
      </Text>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>📊 Analytics & Personalization</Text>
        <Text style={{ fontSize: 14, marginBottom: 12 }}>
          • Goal progress tracking for coaching insights{'\n'}
          • App usage patterns to improve features{'\n'}
          • Performance metrics for better recommendations
        </Text>

        <Text style={{ fontWeight: '600', marginBottom: 8 }}>🔔 Notifications</Text>
        <Text style={{ fontSize: 14, marginBottom: 12 }}>
          • Goal reminders and achievement notifications{'\n'}
          • Daily coaching insights{'\n'}
          • Team updates and collaboration features
        </Text>

        <Text style={{ fontWeight: '600', marginBottom: 8 }}>🔐 Data Protection</Text>
        <Text style={{ fontSize: 14, marginBottom: 12 }}>
          • All data encrypted in transit and at rest{'\n'}
          • No data sold to third parties{'\n'}
          • You can delete your data anytime
        </Text>
      </View>

      <Button
        title="View Full Privacy Policy"
        onPress={openPrivacyPolicy}
        variant="outline"
        style={{ marginBottom: 16 }}
      />

      <Button
        title="Continue with Personalized Experience"
        onPress={requestTrackingPermissions}
        style={{ marginBottom: 8 }}
      />

      <Button
        title="Continue with Basic Features"
        onPress={onPrivacyAccepted}
        variant="secondary"
      />
    </View>
  );
};
```

#### Step 2: App Store Connect Privacy Details Configuration

```typescript
// docs/app-store-privacy-details.md
/*
REQUIRED App Store Connect Privacy Details for LiLove:

## Data Collection Categories:

### 1. Contact Info
- Email Address: Used for account creation and support
- Name: Used for personalization and team features
- Purpose: App Functionality, Analytics

### 2. Health & Fitness
- Fitness and Exercise Data: Goal tracking and progress metrics
- Purpose: App Functionality, Analytics, Product Personalization

### 3. User Content
- Photos or Videos: Profile pictures (optional)
- Other User Content: Goals, tasks, notes, AI chat interactions
- Purpose: App Functionality

### 4. Usage Data
- Product Interaction: App feature usage for improvement
- Advertising Data: Not collected
- Purpose: Analytics, Product Personalization

### 5. Identifiers
- User ID: For account management and data sync
- Device ID: For push notifications and analytics
- Purpose: App Functionality, Analytics

### 6. Diagnostics
- Crash Logs: For app stability improvement
- Performance Data: For optimization
- Purpose: App Functionality, Analytics

## Data Linking to User:
- Email Address: Linked to user
- Name: Linked to user
- User Content: Linked to user
- User ID: Linked to user

## Data Not Linked to User:
- Crash Logs: Not linked to user
- Performance Data: Not linked to user
- General usage analytics: Not linked to user

## Third-Party Partners:
- Expo Push Service: For push notifications
- Analytics Provider: For app improvement (anonymized)
*/
```

### 7.3 Data Collection Disclosures & GDPR Compliance

#### Step 1: Data Collection Transparency
```typescript
// services/dataCollection.ts
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './api';

interface DataConsentSettings {
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  crashReporting: boolean;
}

export class DataCollectionService {
  
  // Get current consent settings
  static async getConsentSettings(): Promise<DataConsentSettings> {
    try {
      const settings = await SecureStore.getItemAsync('dataConsent');
      return settings ? JSON.parse(settings) : {
        analytics: false,
        personalization: false,
        marketing: false,
        crashReporting: true, // Essential for app stability
      };
    } catch (error) {
      console.error('Error getting consent settings:', error);
      return {
        analytics: false,
        personalization: false,
        marketing: false,
        crashReporting: true,
      };
    }
  }

  // Update consent settings
  static async updateConsentSettings(settings: DataConsentSettings) {
    try {
      await SecureStore.setItemAsync('dataConsent', JSON.stringify(settings));
      
      // Send consent settings to backend
      await apiClient.post('/privacy/consent', { consent: settings });
      
      console.log('✅ Data consent settings updated');
    } catch (error) {
      console.error('Error updating consent settings:', error);
    }
  }

  // Check if specific data collection is allowed
  static async isDataCollectionAllowed(type: keyof DataConsentSettings): Promise<boolean> {
    const settings = await this.getConsentSettings();
    return settings[type];
  }

  // GDPR-compliant data export
  static async requestDataExport() {
    try {
      const response = await apiClient.post('/privacy/export-data');
      return response.data;
    } catch (error) {
      console.error('Error requesting data export:', error);
      throw error;
    }
  }

  // GDPR-compliant data deletion
  static async requestDataDeletion() {
    try {
      await apiClient.post('/privacy/delete-data');
      
      // Clear local storage
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('dataConsent');
      
      console.log('✅ Data deletion requested');
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      throw error;
    }
  }
}
```

#### Step 2: GDPR Compliance Backend Implementation
```typescript
// server/privacy-compliance.ts
import { Request, Response } from 'express';
import { db } from './storage';
import { users, goals, tasks, notifications, userSessions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';

export class PrivacyComplianceService {
  
  // Update user consent settings
  static async updateConsent(req: Request, res: Response) {
    try {
      const { consent } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Update user consent in database
      await db.update(users)
        .set({
          dataConsent: JSON.stringify(consent),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      console.log(`✅ Consent updated for user ${userId}:`, consent);
      res.json({ success: true });

    } catch (error) {
      console.error('Consent update error:', error);
      res.status(500).json({ error: 'Failed to update consent' });
    }
  }

  // Export user data (GDPR Article 20)
  static async exportUserData(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Collect all user data
      const userData = await db.select().from(users).where(eq(users.id, userId));
      const userGoals = await db.select().from(goals).where(eq(goals.userId, userId));
      const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
      const userNotifications = await db.select().from(notifications).where(eq(notifications.userId, userId));

      const exportData = {
        profile: userData[0],
        goals: userGoals,
        tasks: userTasks,
        notifications: userNotifications,
        exportDate: new Date().toISOString(),
        dataRetentionInfo: 'Data is retained for service functionality. You can request deletion at any time.',
      };

      // Create ZIP file with user data
      const filename = `lilove-data-export-${userId}-${Date.now()}.zip`;
      const output = createWriteStream(filename);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', async () => {
        // Send file to user
        res.download(filename, async (err) => {
          if (err) {
            console.error('Download error:', err);
          }
          // Clean up file after download
          try {
            await unlink(filename);
          } catch (cleanupError) {
            console.error('File cleanup error:', cleanupError);
          }
        });
      });

      archive.pipe(output);
      archive.append(JSON.stringify(exportData, null, 2), { name: 'lilove-data.json' });
      archive.finalize();

      console.log(`✅ Data export created for user ${userId}`);

    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  }

  // Delete user data (GDPR Article 17 - Right to be forgotten)
  static async deleteUserData(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Delete user data in proper order (foreign key constraints)
      await db.delete(tasks).where(eq(tasks.userId, userId));
      await db.delete(goals).where(eq(goals.userId, userId));
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(userSessions).where(eq(userSessions.userId, userId));
      await db.delete(users).where(eq(users.id, userId));

      console.log(`✅ All data deleted for user ${userId}`);
      res.json({ 
        success: true, 
        message: 'All your data has been permanently deleted.' 
      });

    } catch (error) {
      console.error('Data deletion error:', error);
      res.status(500).json({ error: 'Failed to delete data' });
    }
  }
}

// Add routes to your Express router
export function addPrivacyRoutes(router: any) {
  router.post('/privacy/consent', PrivacyComplianceService.updateConsent);
  router.post('/privacy/export-data', PrivacyComplianceService.exportUserData);
  router.post('/privacy/delete-data', PrivacyComplianceService.deleteUserData);
}
```

### 7.4 App Store Connect Configuration Checklist

#### Complete App Store Information:
```
📋 App Store Connect - App Information:
□ App Name: LiLove
□ Subtitle: AI-Powered Goal Achievement
□ Description: Complete with feature descriptions
□ Keywords: goal tracking, AI coaching, productivity, habit building
□ Support URL: https://lilove.app/support
□ Marketing URL: https://lilove.app
□ Privacy Policy URL: https://lilove.app/privacy-policy

📋 App Store Connect - Privacy Details:
□ Data Types Collected: Contact Info, Health & Fitness, User Content, Usage Data
□ Data Usage: App Functionality, Analytics, Product Personalization
□ Data Linking: Properly configured for each data type
□ Third-Party Partners: Expo Push Service listed

📋 App Store Connect - App Review Information:
□ First Name: [Your Name]
□ Last Name: [Your Last Name]
□ Phone Number: [Your Phone]
□ Email: [Your Email]
□ Demo Account: test@lilove.app / TestPassword123
□ Review Notes: "LiLove helps users achieve goals with AI coaching. Test the goal creation and AI chat features."

📋 App Store Connect - Version Information:
□ Version: 1.0.0
□ Copyright: © 2024 [Your Company]
□ Content Rights: You own or have licensed all rights
□ Age Rating: Completed questionnaire
□ Release: Manual release after approval
```

### 7.5 Pre-Submission Security Audit

#### Final Security Checklist:
```
🔐 Security Audit Checklist:
□ All auth tokens stored in Keychain (expo-secure-store)
□ No hardcoded API keys or secrets
□ HTTPS enforced for all API communication
□ Proper certificate pinning implemented
□ Input validation on all user inputs
□ SQL injection protection (parameterized queries)
□ XSS protection in web views
□ Rate limiting on API endpoints
□ User session management secure
□ Push notification tokens handled securely
□ Data encryption at rest and in transit
□ Privacy settings respect user choices
□ GDPR compliance implemented
□ App Transport Security (ATS) configured
□ No development/debug code in production build
```

---

## 8. Expo EAS Build & Deployment

### 6.1 EAS Account Setup

#### Step 1: Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

#### Step 2: Login to Expo
```bash
eas login
# Enter your Expo account credentials
```

#### Step 3: Configure EAS for Your Project
```bash
cd mobile-expo/LiLove
eas build:configure
```

This creates `eas.json`:
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium",
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

### 6.2 iOS Build Configuration

#### Step 1: Configure app.json for iOS
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.lilove",
      "buildNumber": "1",
      "supportsTablet": true,
      "requireFullScreen": false,
      "userInterfaceStyle": "automatic",
      "infoPlist": {
        "UIBackgroundModes": [
          "background-fetch",
          "remote-notification"
        ],
        "NSFaceIDUsageDescription": "This app uses Face ID for secure authentication",
        "NSCameraUsageDescription": "This app uses camera for profile pictures",
        "NSPhotoLibraryUsageDescription": "This app accesses photo library for profile pictures",
        "UILaunchStoryboardName": "SplashScreen"
      },
      "associatedDomains": [
        "applinks:your-domain.com"
      ]
    }
  }
}
```

#### Step 2: Environment Variables Setup
```bash
# Create .env file for environment variables
cat > .env << EOF
EXPO_PUBLIC_API_URL=https://your-replit-url.replit.app/api
EXPO_PUBLIC_APP_ENV=production
EOF
```

### 6.3 Build Process

#### Step 1: Development Build
```bash
# Build for development testing
eas build --platform ios --profile development
```

#### Step 2: Preview Build (Internal Testing)
```bash
# Build for internal testing
eas build --platform ios --profile preview
```

#### Step 3: Production Build
```bash
# Build for App Store submission
eas build --platform ios --profile production
```

#### Step 4: Monitor Build Progress
1. Builds run on Expo's cloud infrastructure
2. Check progress at [expo.dev/builds](https://expo.dev/builds)
3. Download builds when complete
4. Install on devices for testing

### 6.4 Device Registration for Testing

#### Step 1: Register Development Devices
```bash
# Register your device for development builds
eas device:create
```

#### Step 2: Register TestFlight Devices
1. Devices are automatically registered through TestFlight
2. No manual UDID registration needed for TestFlight builds
3. Maximum 10,000 external testers per app

### 6.5 TestFlight Beta Distribution

#### Step 1: Upload Build to TestFlight
```bash
# Submit build to TestFlight
eas submit --platform ios --latest
```

#### Step 2: Configure TestFlight
1. Go to App Store Connect → TestFlight
2. Select your app and build
3. Add Beta App Information:
   - Beta App Description
   - Feedback Email
   - Marketing URL
   - Privacy Policy URL

#### Step 3: Add Internal Testers
1. Click "Internal Testing" → "+"
2. Add team members (up to 100)
3. Internal testers get immediate access
4. Builds are automatically distributed

#### Step 4: Add External Testers
1. Submit build for Beta Review (1-7 days)
2. Once approved, add external testers
3. Create groups for organized testing
4. Send invitations via email or public link

### 6.6 App Store Submission

#### Step 1: Complete App Store Information
```
App Store Information Checklist:
□ App Name and Subtitle
□ App Description (up to 4,000 characters)
□ Keywords (up to 100 characters)
□ Support URL
□ Marketing URL (optional)
□ Privacy Policy URL
□ App Category
□ Content Rights
□ Age Rating
□ App Review Information
□ Version Release (Manual/Automatic)
```

#### Step 2: Upload Screenshots and Assets
Required iOS Screenshots:
- iPhone 6.7" Display (1290 x 2796 pixels) - 3 required
- iPhone 6.5" Display (1242 x 2688 pixels) - 3 required
- iPhone 5.5" Display (1242 x 2208 pixels) - Optional
- iPad Pro 12.9" Display (2048 x 2732 pixels) - Optional

Additional Assets:
- App Icon (1024 x 1024 pixels)
- App Preview Videos (optional but recommended)

#### Step 3: Submit for Review
```bash
# Final production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

#### Step 4: Monitor Review Process
1. Review typically takes 24-48 hours
2. Check status in App Store Connect
3. Respond to any feedback from Apple
4. Common rejection reasons:
   - Crashes or bugs
   - Design guideline violations
   - Incomplete information
   - Privacy policy issues

---

## 7. Specific LiLove Features

### 7.1 AI Coaching Interface for Mobile

#### Chat Interface Implementation
```typescript
// screens/CoachScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { hapticFeedback } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  typing?: boolean;
}

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    hapticFeedback.light();
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Call AI coaching API
      const response = await apiClient.post('/ai-coach/chat', {
        message: inputText,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      hapticFeedback.success();
    } catch (error) {
      console.error('Failed to send message:', error);
      hapticFeedback.error();
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage,
    ]}>
      <Text style={[
        styles.messageText,
        item.isUser ? styles.userMessageText : styles.aiMessageText,
      ]}>
        {item.text}
      </Text>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );

  return (
    <SafeAreaWrapper style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Coach</Text>
        <Text style={styles.headerSubtitle}>Your personal growth companion</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>Coach is typing...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask your coach anything..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isTyping}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={inputText.trim() ? '#8B5CF6' : '#9CA3AF'} 
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}
```

### 7.2 Goal Management on Mobile

#### Goals List Screen
```typescript
// screens/GoalsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { useGoals, useUpdateGoal } from '../hooks/useGoals';
import { hapticFeedback } from '../utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function GoalsScreen() {
  const { data: goals, isLoading, refetch } = useGoals();
  const updateGoal = useUpdateGoal();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const updateProgress = async (goalId: string, progress: number) => {
    hapticFeedback.medium();
    await updateGoal.mutateAsync({
      id: goalId,
      updates: { progress: progress.toString() },
    });
  };

  const renderGoal = ({ item: goal }) => (
    <View style={styles.goalCard}>
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.goalGradient}
      >
        <View style={styles.goalHeader}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalProgress}>
            {goal.progress}% Complete
          </Text>
        </View>
        
        <Text style={styles.goalDescription}>
          {goal.description}
        </Text>

        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${goal.progress}%` }
            ]} 
          />
        </View>

        <View style={styles.goalActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateProgress(goal.id, Math.min(100, parseInt(goal.progress) + 10))}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>+10%</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateProgress(goal.id, Math.max(0, parseInt(goal.progress) - 10))}
          >
            <Ionicons name="remove-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>-10%</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaWrapper style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Goals</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={goals}
        renderItem={renderGoal}
        keyExtractor={item => item.id}
        style={styles.goalsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaWrapper>
  );
}
```

### 7.3 Gamification Features Adaptation

#### Achievement System
```typescript
// components/AchievementCard.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '../utils/haptics';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

interface AchievementCardProps {
  achievement: Achievement;
  onPress?: () => void;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(achievement.unlocked ? 1 : 0.6);

  useEffect(() => {
    if (achievement.unlocked) {
      hapticFeedback.success();
      scale.value = withSequence(
        withSpring(1.1),
        withSpring(1)
      );
    }
  }, [achievement.unlocked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const progressPercentage = achievement.progress && achievement.maxProgress
    ? (achievement.progress / achievement.maxProgress) * 100
    : 0;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        colors={achievement.unlocked 
          ? ['#F59E0B', '#D97706'] 
          : ['#E5E7EB', '#D1D5DB']
        }
        style={styles.gradient}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={achievement.icon as any} 
            size={32} 
            color={achievement.unlocked ? '#FFFFFF' : '#9CA3AF'} 
          />
        </View>
        
        <Text style={[
          styles.title,
          { color: achievement.unlocked ? '#FFFFFF' : '#6B7280' }
        ]}>
          {achievement.title}
        </Text>
        
        <Text style={[
          styles.description,
          { color: achievement.unlocked ? '#FEF3C7' : '#9CA3AF' }
        ]}>
          {achievement.description}
        </Text>

        {achievement.progress !== undefined && achievement.maxProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${progressPercentage}%`,
                    backgroundColor: achievement.unlocked ? '#FEF3C7' : '#D1D5DB'
                  }
                ]} 
              />
            </View>
            <Text style={[
              styles.progressText,
              { color: achievement.unlocked ? '#FEF3C7' : '#9CA3AF' }
            ]}>
              {achievement.progress}/{achievement.maxProgress}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};
```

### 7.4 Analytics Dashboard for Mobile

#### Dashboard Cards Component
```typescript
// components/DashboardCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  colors: string[];
  onPress?: () => void;
  progress?: number;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colors,
  onPress,
  progress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={!onPress}>
      <LinearGradient colors={colors} style={styles.gradient}>
        <View style={styles.header}>
          <Ionicons name={icon as any} size={28} color="#FFFFFF" />
          <Text style={styles.value}>{value}</Text>
        </View>
        
        <Text style={styles.title}>{title}</Text>
        
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}

        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${progress}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  subtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
});
```

### 7.5 Team Collaboration on Mobile

#### Team Chat Component
```typescript
// components/TeamChat.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';

interface TeamMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
  type: 'message' | 'achievement' | 'goal-update';
}

export const TeamChat: React.FC<{ teamId: string }> = ({ teamId }) => {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const newSocket = io('wss://your-backend-url.replit.app', {
      transports: ['websocket'],
    });

    newSocket.emit('join-team', teamId);

    newSocket.on('team-message', (message: TeamMessage) => {
      setMessages(prev => [...prev, message]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [teamId]);

  const sendMessage = () => {
    if (!inputText.trim() || !socket) return;

    const message = {
      teamId,
      text: inputText,
      type: 'message',
    };

    socket.emit('team-message', message);
    setInputText('');
  };

  const renderMessage = ({ item }: { item: TeamMessage }) => (
    <View style={styles.messageContainer}>
      <Text style={styles.username}>{item.username}</Text>
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="#8B5CF6" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### 7.6 Profile Management Mobile Interface

#### Profile Screen Implementation
```typescript
// screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { hapticFeedback } from '../utils/haptics';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profileImage, setProfileImage] = useState(user?.profileImageUrl);

  const pickImage = async () => {
    hapticFeedback.medium();
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      // Upload image to backend
      // await uploadProfileImage(result.assets[0].uri);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            hapticFeedback.medium();
            await logout();
          }
        },
      ]
    );
  };

  const profileOptions = [
    { 
      title: 'Edit Profile', 
      icon: 'person-outline', 
      onPress: () => {} 
    },
    { 
      title: 'Notifications', 
      icon: 'notifications-outline', 
      onPress: () => {} 
    },
    { 
      title: 'Privacy Settings', 
      icon: 'lock-closed-outline', 
      onPress: () => {} 
    },
    { 
      title: 'Help & Support', 
      icon: 'help-circle-outline', 
      onPress: () => {} 
    },
    { 
      title: 'About', 
      icon: 'information-circle-outline', 
      onPress: () => {} 
    },
  ];

  return (
    <SafeAreaWrapper style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            <Image
              source={{ 
                uri: profileImage || 'https://via.placeholder.com/120/8B5CF6/FFFFFF?text=LiLove' 
              }}
              style={styles.profileImage}
            />
            <View style={styles.editIcon}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.displayName}>
            {user?.displayName || user?.username || 'Beautiful Soul'}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Level 5</Text>
            <Text style={styles.statLabel}>Current Level</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Goals Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>7</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Profile Options */}
        <View style={styles.optionsContainer}>
          {profileOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionRow}
              onPress={() => {
                hapticFeedback.light();
                option.onPress();
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color="#8B5CF6" 
                />
                <Text style={styles.optionTitle}>{option.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#8B5CF6',
  },
  editIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    marginLeft: 8,
    fontWeight: '600',
  },
});
```

---

## 8. Testing & Deployment Workflow

### 8.1 Development Testing with Expo Go

#### Step 1: Set Up Testing Environment
```bash
# Start development server
cd mobile-expo/LiLove
npm start

# For tunnel access (recommended for remote testing)
expo start --tunnel

# For LAN access (faster, same network only)
expo start --lan
```

#### Step 2: Device Testing Checklist
```
Testing Checklist:
□ Authentication flow (login/logout)
□ Navigation between screens
□ API connectivity (goals, coaching, profile)
□ Offline functionality
□ Push notifications
□ Image upload functionality
□ Performance on different devices
□ Orientation changes
□ Background/foreground transitions
□ Memory usage
□ Network error handling
```

#### Step 3: Debugging Tools Setup
```typescript
// utils/debugging.ts
import { Alert } from 'react-native';

export const debugLog = (message: string, data?: any) => {
  if (__DEV__) {
    console.log(`[LiLove Debug] ${message}`, data);
  }
};

export const showDebugAlert = (title: string, message: string) => {
  if (__DEV__) {
    Alert.alert(`Debug: ${title}`, message);
  }
};

// Network debugging
export const logNetworkRequest = (url: string, method: string, data?: any) => {
  if (__DEV__) {
    console.log(`[Network] ${method} ${url}`, data);
  }
};
```

### 8.2 Production Build Testing

#### Step 1: Create Production Build
```bash
# Build production version
eas build --platform ios --profile production

# Wait for build to complete
# Download .ipa file when ready
```

#### Step 2: Install on Physical Device
```bash
# Install via Apple Configurator 2 (Mac)
# Or use TestFlight for easier distribution

# Submit to TestFlight for internal testing
eas submit --platform ios --latest
```

#### Step 3: Production Testing Checklist
```
Production Testing:
□ App launches without crashes
□ All features work as expected
□ Performance is acceptable
□ No debug logs or test data
□ App Store guidelines compliance
□ Privacy policy implementation
□ Accessibility features
□ Different iOS versions compatibility
□ Different device sizes (iPhone/iPad)
```

### 8.3 TestFlight Distribution

#### Step 1: Internal Testing
```
Internal Testing Process:
1. Upload build via EAS Submit
2. Add internal testers (team members)
3. Test critical user flows
4. Document any issues
5. Fix issues and upload new build
6. Repeat until stable
```

#### Step 2: External Testing
```
External Testing Process:
1. Submit for Beta App Review
2. Add external testers (up to 10,000)
3. Create testing groups:
   - Alpha Testers (core features)
   - Beta Testers (general functionality)
   - Accessibility Testers
4. Collect feedback via TestFlight
5. Implement improvements
```

#### Step 3: TestFlight Feedback Collection
```typescript
// utils/feedback.ts
import { Alert, Linking } from 'react-native';

export const collectFeedback = () => {
  Alert.alert(
    'Beta Feedback',
    'Help us improve LiLove! Would you like to provide feedback?',
    [
      { text: 'Not Now', style: 'cancel' },
      { 
        text: 'Send Feedback', 
        onPress: () => {
          // Open TestFlight feedback or email
          Linking.openURL('mailto:feedback@lilove.app?subject=LiLove Beta Feedback');
        }
      },
    ]
  );
};
```

### 8.4 App Store Review Guidelines Compliance

#### Step 1: Review Guidelines Checklist
```
App Store Review Guidelines:
□ Safety
  - User-generated content moderation
  - Personal attacks protection
  - Appropriate content ratings

□ Performance
  - No crashes or bugs
  - Fast launch time
  - Proper memory management

□ Business
  - Accurate app description
  - Proper in-app purchases (if any)
  - Subscription terms clarity

□ Design
  - iOS design principles
  - Native iOS controls
  - Proper navigation patterns

□ Legal
  - Privacy policy compliance
  - Terms of service
  - Data collection transparency
```

#### Step 2: Privacy Policy Implementation
```typescript
// components/PrivacyPolicy.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { SafeAreaWrapper } from './SafeAreaWrapper';
import { Button } from './Button';

export const PrivacyPolicy: React.FC = () => {
  const openPrivacyPolicy = () => {
    Linking.openURL('https://lilove.app/privacy-policy');
  };

  return (
    <SafeAreaWrapper style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.content}>
          Your privacy is important to us. This privacy policy explains how 
          LiLove collects, uses, and protects your information.
          {'\n\n'}
          Data Collection:
          - Goal and task information for coaching
          - Performance analytics for insights
          - Profile information for personalization
          {'\n\n'}
          Data Usage:
          - Provide personalized AI coaching
          - Track progress and achievements
          - Improve app functionality
          {'\n\n'}
          Data Protection:
          - Encrypted data transmission
          - Secure server storage
          - No data sharing with third parties
        </Text>
        
        <Button
          title="View Full Privacy Policy"
          onPress={openPrivacyPolicy}
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
};
```

#### Step 3: Accessibility Implementation
```typescript
// utils/accessibility.ts
import { AccessibilityInfo } from 'react-native';

export const announceForAccessibility = (message: string) => {
  AccessibilityInfo.announceForAccessibility(message);
};

// Example usage in components
// Add accessibility props to interactive elements
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Create new goal"
  accessibilityHint="Tap to open goal creation form"
  accessibilityRole="button"
  onPress={createGoal}
>
  <Text>Create Goal</Text>
</TouchableOpacity>
```

### 8.5 Final App Store Deployment

#### Step 1: Pre-Submission Checklist
```
Final Checklist:
□ App Information Complete
  - App name and subtitle
  - Description and keywords
  - Screenshots for all supported devices
  - App icon (1024x1024)

□ Build Quality
  - No crashes or major bugs
  - Good performance
  - Proper error handling
  - Loading states implemented

□ Metadata Accuracy
  - Accurate feature descriptions
  - Proper category selection
  - Correct age rating

□ Legal Requirements
  - Privacy policy URL
  - Terms of service
  - Support contact information
```

#### Step 2: Submit for Review
```bash
# Final production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest

# Monitor submission status
# Check App Store Connect for updates
```

#### Step 3: Handle Review Feedback
```
Common Review Issues and Solutions:

1. Crashes:
   - Add comprehensive error handling
   - Test on multiple iOS versions
   - Use crash reporting (Sentry, Bugsnag)

2. Design Issues:
   - Follow iOS Human Interface Guidelines
   - Use native iOS controls
   - Proper navigation patterns

3. Functionality Issues:
   - Ensure all features work as described
   - Test with poor network conditions
   - Handle edge cases gracefully

4. Metadata Issues:
   - Accurate app description
   - Screenshots match actual app
   - Keywords relevant to functionality
```

#### Step 4: Launch Day Preparation
```
Launch Day Checklist:
□ Press release prepared
□ Social media announcements ready
□ Support documentation updated
□ Monitoring tools in place
□ Team ready for user support
□ App Store optimization complete
□ User onboarding optimized
```

#### Step 5: Post-Launch Monitoring
```typescript
// utils/analytics.ts
import { Analytics } from 'expo-analytics';

export const trackEvent = (eventName: string, properties?: object) => {
  if (!__DEV__) {
    Analytics.track(eventName, properties);
  }
};

// Track key user actions
trackEvent('app_launched');
trackEvent('goal_created', { category: goalCategory });
trackEvent('coaching_session_started');
trackEvent('achievement_unlocked', { achievementId });
```

---

## 🎯 Success Metrics & KPIs

### Key Performance Indicators
- **User Retention**: 70% Day 1, 40% Day 7, 20% Day 30
- **Goal Completion Rate**: 60% of created goals
- **AI Coaching Engagement**: 3+ sessions per week
- **App Store Rating**: 4.5+ stars
- **Crash-Free Sessions**: 99.5%+

### Monitoring Tools
- **Crash Reporting**: Sentry or Bugsnag
- **Analytics**: Expo Analytics + Custom backend analytics
- **Performance**: Expo Performance monitoring
- **User Feedback**: In-app feedback + App Store reviews

---

## 🚀 Next Steps

1. **Complete Expo Migration**: Follow Section 1 to migrate from vanilla React Native
2. **Set Up Development Environment**: Follow Section 2 for Replit + Expo setup
3. **Implement Code Sharing**: Follow Section 3 for web-mobile code sharing
4. **Add iOS Features**: Follow Section 4 for iOS-specific implementations
5. **Apple Developer Setup**: Follow Section 5 for developer account and certificates
6. **Build and Deploy**: Follow Section 6 for EAS builds and App Store submission
7. **Feature Implementation**: Follow Section 7 for LiLove-specific features
8. **Testing and Launch**: Follow Section 8 for comprehensive testing and deployment

---

## 📞 Support and Resources

### Official Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Development Tools
- [Expo CLI](https://docs.expo.dev/workflow/expo-cli/)
- [EAS CLI](https://docs.expo.dev/build/setup/)
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/)

### Community Resources
- [Expo Discord](https://discord.gg/4gtbPAdpaE)
- [React Native Community](https://reactnative.dev/community/support)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

---

This comprehensive guide provides everything needed to transform your LiLove web app into a successful iOS application. Follow each section systematically, and you'll have a production-ready iOS app in the App Store.

Good luck with your iOS development journey! 🚀📱