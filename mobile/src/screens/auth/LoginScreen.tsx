import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { tokenManager } from '../../services/tokenManager';
import { DEMO_TOKEN, demoSifirla } from '../../lib/demoData';
import * as AppleAuthentication from 'expo-apple-authentication';
import appleAuth from '../../services/appleAuth';
import { useGoogleAuth, getIdTokenFromResponse } from '../../services/googleAuth';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../../assets/Logo';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, appleLogin, googleLogin, isLoading, error, clearError } = useAuthStore();
  
  const { request: googleRequest, response: googleResponse, promptAsync: googlePromptAsync } = useGoogleAuth();

  useEffect(() => {
    checkAppleAuthAvailability();
  }, []);

  useEffect(() => {
    handleGoogleResponse();
  }, [googleResponse]);

  const checkAppleAuthAvailability = async () => {
    const isAvailable = await appleAuth.isAvailable();
    setIsAppleAuthAvailable(isAvailable);
  };

  const handleGoogleResponse = async () => {
    if (googleResponse?.type === 'success') {
      try {
        setIsGoogleLoading(true);
        clearError();
        
        const idToken = getIdTokenFromResponse(googleResponse);
        
        console.log('[Google Auth] Response type:', googleResponse.type);
        console.log('[Google Auth] Has idToken:', !!idToken);
        
        if (!idToken) {
          console.error('[Google Auth] No ID token in response');
          throw new Error('Google authentication did not return an ID token. Please try again.');
        }
        
        await googleLogin({ idToken });
        
      } catch (error: any) {
        console.error('[Google Auth] Error:', error);
        Alert.alert('Google Sign In Failed', error.message || 'Please try again');
      } finally {
        setIsGoogleLoading(false);
      }
    } else if (googleResponse?.type === 'error') {
      console.error('[Google Auth] Error response:', googleResponse.error);
      Alert.alert('Google Sign In Failed', googleResponse.error?.message || 'Authentication failed');
    } else if (googleResponse?.type === 'cancel') {
      console.log('[Google Auth] User cancelled');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      clearError();
      await googlePromptAsync();
    } catch (error: any) {
      Alert.alert('Google Sign In Failed', error.message || 'Please try again');
    }
  };

  const demoBaslat = async () => {
    demoSifirla();
    await tokenManager.setToken(DEMO_TOKEN);
    useAuthStore.setState({
      isAuthenticated: true,
      isDemo: true,
      isLoading: false,
      error: null,
      user: null,
      userProfile: {
        id: 'demo-user',
        email: 'demo@lilove.app',
        displayName: 'Demo',
        coinBalance: 1250,
        subscriptionTier: 'free',
      } as any,
    });
  };

  const handleLogin = async () => {
    try {
      clearError();
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Please check your credentials');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      clearError();
      const response = await appleAuth.signIn();
      await appleLogin(response);
    } catch (error: any) {
      if (error.message !== 'Sign in was canceled') {
        Alert.alert('Apple Sign In Failed', error.message || 'Please try again');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Logo width={96} height={96} />
        </View>
        <Text style={styles.title}>LiLove</Text>
        <Text style={styles.subtitle}>Love Your Growth, Live Your Peak</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {isAppleAuthAvailable && (
            <TouchableOpacity 
              style={styles.appleButton} 
              onPress={handleAppleSignIn}
              disabled={isLoading || isGoogleLoading}
            >
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[
              styles.googleButton, 
              (isLoading || isGoogleLoading || !googleRequest) && styles.socialButtonDisabled
            ]} 
            onPress={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading || !googleRequest}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" size="small" />
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          {/* HESAPSIZ TUR.
              İki sebeple var: App Review giriş duvarını aşamıyordu
              (kesin 2.1), ve bu kategoride zorunlu kayıt ilk açılıştaki
              en büyük terk sebebi. Demo verisi ÖRNEK olduğunu söylüyor;
              "çevrimdışı kip" değil. */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={demoBaslat}
            accessibilityRole="button"
            accessibilityLabel="Look around without an account, with sample data"
            data-testid="button-demo"
          >
            <Text style={styles.demoButtonText}>Look around without an account</Text>
            <Text style={styles.demoButtonHint}>Sample data · nothing is saved to your account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  demoButton: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 12,
  },
  demoButtonText: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 15,
  },
  demoButtonHint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 48,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  linkTextBold: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 12,
  },
  appleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  appleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    minHeight: 56,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
});
